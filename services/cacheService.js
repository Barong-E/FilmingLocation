// 🚀 하이브리드 캐싱 시스템 (Redis + 메모리)
import redisManager from '../config/redis.js';

const CACHE_KEY_PREFIX = 'filo';
const DEFAULT_TTL_SECONDS = 3600;
const DEFAULT_MEMORY_CACHE_MAX_SIZE = 1000;
const RECOMMENDED_MIN_HIT_RATE = 70;
const REDIS_ERROR_RECOMMENDATION_THRESHOLD = 10;
const MEMORY_USAGE_WARNING_RATIO = 0.9;
const CACHE_CLEAR_PATTERN = `${CACHE_KEY_PREFIX}:*`;
const HEALTHY_STATUS = 'healthy';
const DEGRADED_STATUS = 'degraded';

class HybridCacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = this._createInitialStats();
    this.maxMemorySize = DEFAULT_MEMORY_CACHE_MAX_SIZE;
    this.memoryTtl = new Map();
    console.log('🎯 하이브리드 캐싱 시스템 초기화');
  }

  _createInitialStats() {
    return {
      redis: { hits: 0, misses: 0, sets: 0, errors: 0 },
      memory: { hits: 0, misses: 0, sets: 0, evictions: 0 },
      total: { requests: 0, hitRate: 0 },
    };
  }

  _createKey(namespace, key) {
    return `${CACHE_KEY_PREFIX}:${namespace}:${key}`;
  }

  _clearMemoryTimeout(cacheKey) {
    const timeout = this.memoryTtl.get(cacheKey);
    if (!timeout) return;

    clearTimeout(timeout);
    this.memoryTtl.delete(cacheKey);
  }

  _removeMemoryItem(cacheKey) {
    this.memoryCache.delete(cacheKey);
    this._clearMemoryTimeout(cacheKey);
  }

  _upsertMemoryCache(cacheKey, value, ttlSeconds) {
    this._evictOldestMemory();
    this.memoryCache.set(cacheKey, {
      value,
      timestamp: Date.now(),
      ttl: ttlSeconds,
    });
    this._setMemoryTtl(cacheKey, ttlSeconds);
    this.cacheStats.memory.sets++;
  }

  _setMemoryTtl(key, ttlSeconds) {
    if (!ttlSeconds || ttlSeconds <= 0) return;

    this._clearMemoryTimeout(key);
    const timeout = setTimeout(() => {
      this.memoryCache.delete(key);
      this.memoryTtl.delete(key);
      this.cacheStats.memory.evictions++;
    }, ttlSeconds * 1000);
    this.memoryTtl.set(key, timeout);
  }

  _evictOldestMemory() {
    if (this.memoryCache.size < this.maxMemorySize) return;

    const oldestCacheKey = this.memoryCache.keys().next().value;
    this._removeMemoryItem(oldestCacheKey);
    this.cacheStats.memory.evictions++;
  }

  _isMemoryItemExpired(memoryItem) {
    if (!memoryItem?.ttl || memoryItem.ttl <= 0) return false;
    const elapsedSeconds = (Date.now() - memoryItem.timestamp) / 1000;
    return elapsedSeconds > memoryItem.ttl;
  }

  _updateHitRate() {
    const totalHits = this.cacheStats.redis.hits + this.cacheStats.memory.hits;
    const totalMisses = this.cacheStats.redis.misses + this.cacheStats.memory.misses;
    const totalRequests = totalHits + totalMisses;

    this.cacheStats.total.hitRate =
      totalRequests > 0 ? Number(((totalHits / totalRequests) * 100).toFixed(2)) : 0;
  }

  async set(namespace, key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const cacheKey = this._createKey(namespace, key);
    this.cacheStats.total.requests++;

    let redisSuccess = false;
    let memorySuccess = false;

    try {
      redisSuccess = await redisManager.set(cacheKey, value, ttlSeconds);
      if (redisSuccess) {
        this.cacheStats.redis.sets++;
      }
    } catch (error) {
      console.error('❌ Redis 저장 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    try {
      this._upsertMemoryCache(cacheKey, value, ttlSeconds);
      memorySuccess = true;
    } catch (error) {
      console.error('❌ 메모리 캐시 저장 오류:', error.message);
    }

    return redisSuccess || memorySuccess;
  }

  async get(namespace, key) {
    const cacheKey = this._createKey(namespace, key);
    this.cacheStats.total.requests++;

    try {
      const redisValue = await redisManager.get(cacheKey);
      if (redisValue !== null) {
        this.cacheStats.redis.hits++;
        this._updateHitRate();

        this._upsertMemoryCache(cacheKey, redisValue, null);
        return redisValue;
      }
      this.cacheStats.redis.misses++;
    } catch (error) {
      console.error('❌ Redis 조회 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    const memoryItem = this.memoryCache.get(cacheKey);
    if (memoryItem && !this._isMemoryItemExpired(memoryItem)) {
      this.cacheStats.memory.hits++;
      this._updateHitRate();
      return memoryItem.value;
    }

    if (memoryItem && this._isMemoryItemExpired(memoryItem)) {
      this._removeMemoryItem(cacheKey);
    }

    this.cacheStats.memory.misses++;
    this._updateHitRate();
    return null;
  }

  async del(namespace, key) {
    const cacheKey = this._createKey(namespace, key);

    let redisDeleted = false;
    let memoryDeleted = false;

    try {
      redisDeleted = await redisManager.del(cacheKey);
    } catch (error) {
      console.error('❌ Redis 삭제 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    if (this.memoryCache.has(cacheKey)) {
      this._removeMemoryItem(cacheKey);
      memoryDeleted = true;
    }

    return redisDeleted || memoryDeleted;
  }

  async delPattern(namespace, pattern) {
    const cachePattern = this._createKey(namespace, pattern);
    let deletedCount = 0;

    try {
      const redisDeleted = await redisManager.delPattern(cachePattern);
      deletedCount += redisDeleted;
    } catch (error) {
      console.error('❌ Redis 패턴 삭제 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    const memoryPattern = new RegExp(cachePattern.replace(/\*/g, '.*'));
    const keysToDelete = [];

    for (const key of this.memoryCache.keys()) {
      if (memoryPattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this._removeMemoryItem(key);
      deletedCount++;
    }

    return deletedCount;
  }

  async clear() {
    let cleared = 0;

    try {
      cleared += await redisManager.delPattern(CACHE_CLEAR_PATTERN);
    } catch (error) {
      console.error('❌ Redis 초기화 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    cleared += this.memoryCache.size;
    this.memoryCache.clear();

    for (const timeout of this.memoryTtl.values()) {
      clearTimeout(timeout);
    }
    this.memoryTtl.clear();

    this.cacheStats = this._createInitialStats();

    console.log(`🧹 캐시 초기화 완료 (${cleared}개 항목 삭제)`);
    return cleared;
  }

  async getStats() {
    try {
      const redisStats = await redisManager.getStats();
      return {
        redis: {
          connected: redisManager.isReady(),
          ...this.cacheStats.redis,
          ...(redisStats || {}),
        },
        memory: {
          size: this.memoryCache.size,
          maxSize: this.maxMemorySize,
          ttlTimers: this.memoryTtl.size,
          ...this.cacheStats.memory,
        },
        total: this.cacheStats.total,
        performance: {
          hitRate: `${this.cacheStats.total.hitRate}%`,
          totalRequests: this.cacheStats.total.requests,
          redisPreference: this.cacheStats.redis.hits > this.cacheStats.memory.hits,
        },
      };
    } catch (error) {
      console.error('❌ 캐시 통계 조회 오류:', error.message);
      this.cacheStats.redis.errors++;
      return {
        redis: {
          connected: false,
          ...this.cacheStats.redis,
        },
        memory: {
          size: this.memoryCache.size,
          maxSize: this.maxMemorySize,
          ttlTimers: this.memoryTtl.size,
          ...this.cacheStats.memory,
        },
        total: this.cacheStats.total,
        performance: {
          hitRate: `${this.cacheStats.total.hitRate}%`,
          totalRequests: this.cacheStats.total.requests,
          redisPreference: false,
        },
      };
    }
  }

  async healthCheck() {
    const stats = await this.getStats();
    return {
      status: redisManager.isReady() ? HEALTHY_STATUS : DEGRADED_STATUS,
      redis: {
        connected: stats.redis.connected,
        errors: stats.redis.errors,
      },
      memory: {
        usage: `${stats.memory.size}/${stats.memory.maxSize}`,
        hitRate: stats.total.hitRate,
      },
      recommendations: this._getRecommendations(stats),
    };
  }

  _getRecommendations(stats) {
    const recommendations = [];

    if (!stats.redis.connected) {
      recommendations.push('Redis 서버 연결을 확인하세요');
    }

    if (Number(stats.total.hitRate) < RECOMMENDED_MIN_HIT_RATE) {
      recommendations.push('캐시 히트율이 낮습니다. TTL 설정을 검토하세요');
    }

    if (stats.memory.size >= stats.memory.maxSize * MEMORY_USAGE_WARNING_RATIO) {
      recommendations.push('메모리 캐시 크기를 늘리는 것을 고려하세요');
    }

    if (stats.redis.errors > REDIS_ERROR_RECOMMENDATION_THRESHOLD) {
      recommendations.push('Redis 연결 상태를 점검하세요');
    }

    return recommendations;
  }
}

// 클래스 export (필요시 사용)
export { HybridCacheService };

// 싱글톤 인스턴스 생성 및 export
const hybridCache = new HybridCacheService();
export { hybridCache };
export default hybridCache;

