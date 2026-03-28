// 🚀 하이브리드 캐싱 시스템 (Redis + 메모리)
import redisManager from '../config/redis.js';

class HybridCacheService {
  constructor() {
    // 메모리 캐시 (Redis 백업용)
    this.memoryCache = new Map();
    this.cacheStats = {
      redis: { hits: 0, misses: 0, sets: 0, errors: 0 },
      memory: { hits: 0, misses: 0, sets: 0, evictions: 0 },
      total: { requests: 0, hitRate: 0 }
    };
    
    // 메모리 캐시 최대 크기 (항목 수)
    this.maxMemorySize = 1000;
    
    // TTL 관리를 위한 타이머 맵
    this.memoryTtl = new Map();
    
    console.log('🎯 하이브리드 캐싱 시스템 초기화');
  }

  // 캐시 키 생성 (네임스페이스 포함)
  _createKey(namespace, key) {
    return `filo:${namespace}:${key}`;
  }

  // 메모리 캐시 TTL 관리
  _setMemoryTtl(key, ttlSeconds) {
    if (ttlSeconds && ttlSeconds > 0) {
      const timeout = setTimeout(() => {
        this.memoryCache.delete(key);
        this.memoryTtl.delete(key);
        this.cacheStats.memory.evictions++;
      }, ttlSeconds * 1000);
      
      this.memoryTtl.set(key, timeout);
    }
  }

  // 메모리 캐시 크기 관리 (LRU 방식)
  _evictOldestMemory() {
    if (this.memoryCache.size >= this.maxMemorySize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
      
      // TTL 타이머도 정리
      const timeout = this.memoryTtl.get(firstKey);
      if (timeout) {
        clearTimeout(timeout);
        this.memoryTtl.delete(firstKey);
      }
      
      this.cacheStats.memory.evictions++;
    }
  }

  // 값 저장 (Redis 우선, 메모리 백업)
  async set(namespace, key, value, ttlSeconds = 3600) {
    const cacheKey = this._createKey(namespace, key);
    this.cacheStats.total.requests++;
    
    let redisSuccess = false;
    let memorySuccess = false;

    // Redis에 저장 시도
    try {
      redisSuccess = await redisManager.set(cacheKey, value, ttlSeconds);
      if (redisSuccess) {
        this.cacheStats.redis.sets++;
      }
    } catch (error) {
      console.error('❌ Redis 저장 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    // 메모리에도 저장 (백업용)
    try {
      this._evictOldestMemory();
      this.memoryCache.set(cacheKey, {
        value,
        timestamp: Date.now(),
        ttl: ttlSeconds
      });
      this._setMemoryTtl(cacheKey, ttlSeconds);
      memorySuccess = true;
      this.cacheStats.memory.sets++;
    } catch (error) {
      console.error('❌ 메모리 캐시 저장 오류:', error.message);
    }

    return redisSuccess || memorySuccess;
  }

  // 값 조회 (Redis 우선, 메모리 백업)
  async get(namespace, key) {
    const cacheKey = this._createKey(namespace, key);
    this.cacheStats.total.requests++;
    
    // Redis에서 조회 시도
    try {
      const redisValue = await redisManager.get(cacheKey);
      if (redisValue !== null) {
        this.cacheStats.redis.hits++;
        this._updateHitRate();
        
        // 메모리 캐시도 업데이트 (동기화)
        this.memoryCache.set(cacheKey, {
          value: redisValue,
          timestamp: Date.now(),
          ttl: null // Redis TTL 사용
        });
        
        return redisValue;
      } else {
        this.cacheStats.redis.misses++;
      }
    } catch (error) {
      console.error('❌ Redis 조회 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    // 메모리 캐시에서 조회
    const memoryItem = this.memoryCache.get(cacheKey);
    if (memoryItem) {
      // TTL 확인
      if (memoryItem.ttl && memoryItem.ttl > 0) {
        const elapsed = (Date.now() - memoryItem.timestamp) / 1000;
        if (elapsed > memoryItem.ttl) {
          // 만료된 항목 삭제
          this.memoryCache.delete(cacheKey);
          const timeout = this.memoryTtl.get(cacheKey);
          if (timeout) {
            clearTimeout(timeout);
            this.memoryTtl.delete(cacheKey);
          }
          this.cacheStats.memory.misses++;
          this._updateHitRate();
          return null;
        }
      }
      
      this.cacheStats.memory.hits++;
      this._updateHitRate();
      return memoryItem.value;
    }

    this.cacheStats.memory.misses++;
    this._updateHitRate();
    return null;
  }

  // 값 삭제
  async del(namespace, key) {
    const cacheKey = this._createKey(namespace, key);
    
    let redisDeleted = false;
    let memoryDeleted = false;

    // Redis에서 삭제
    try {
      redisDeleted = await redisManager.del(cacheKey);
    } catch (error) {
      console.error('❌ Redis 삭제 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    // 메모리에서 삭제
    if (this.memoryCache.has(cacheKey)) {
      this.memoryCache.delete(cacheKey);
      const timeout = this.memoryTtl.get(cacheKey);
      if (timeout) {
        clearTimeout(timeout);
        this.memoryTtl.delete(cacheKey);
      }
      memoryDeleted = true;
    }

    return redisDeleted || memoryDeleted;
  }

  // 패턴으로 삭제
  async delPattern(namespace, pattern) {
    const cachePattern = this._createKey(namespace, pattern);
    
    let deletedCount = 0;

    // Redis에서 패턴 삭제
    try {
      const redisDeleted = await redisManager.delPattern(cachePattern);
      deletedCount += redisDeleted;
    } catch (error) {
      console.error('❌ Redis 패턴 삭제 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    // 메모리에서 패턴 삭제
    const memoryPattern = new RegExp(cachePattern.replace(/\*/g, '.*'));
    const keysToDelete = [];
    
    for (const key of this.memoryCache.keys()) {
      if (memoryPattern.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.memoryCache.delete(key);
      const timeout = this.memoryTtl.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.memoryTtl.delete(key);
      }
      deletedCount++;
    }

    return deletedCount;
  }

  // 전체 캐시 초기화
  async clear() {
    let cleared = 0;

    // Redis 초기화
    try {
      cleared += await redisManager.delPattern('filo:*');
    } catch (error) {
      console.error('❌ Redis 초기화 오류:', error.message);
      this.cacheStats.redis.errors++;
    }

    // 메모리 캐시 초기화
    cleared += this.memoryCache.size;
    this.memoryCache.clear();
    
    // TTL 타이머 모두 정리
    for (const timeout of this.memoryTtl.values()) {
      clearTimeout(timeout);
    }
    this.memoryTtl.clear();

    // 통계 초기화
    this.cacheStats = {
      redis: { hits: 0, misses: 0, sets: 0, errors: 0 },
      memory: { hits: 0, misses: 0, sets: 0, evictions: 0 },
      total: { requests: 0, hitRate: 0 }
    };

    console.log(`🧹 캐시 초기화 완료 (${cleared}개 항목 삭제)`);
    return cleared;
  }

  // 히트율 업데이트
  _updateHitRate() {
    const totalHits = this.cacheStats.redis.hits + this.cacheStats.memory.hits;
    const totalMisses = this.cacheStats.redis.misses + this.cacheStats.memory.misses;
    const totalRequests = totalHits + totalMisses;
    
    this.cacheStats.total.hitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0;
  }

  // 캐시 통계
  async getStats() {
    const redisStats = await redisManager.getStats();
    
    return {
      redis: {
        connected: redisManager.isReady(),
        ...this.cacheStats.redis,
        ...(redisStats || {})
      },
      memory: {
        size: this.memoryCache.size,
        maxSize: this.maxMemorySize,
        ttlTimers: this.memoryTtl.size,
        ...this.cacheStats.memory
      },
      total: this.cacheStats.total,
      performance: {
        hitRate: `${this.cacheStats.total.hitRate}%`,
        totalRequests: this.cacheStats.total.requests,
        redisPreference: this.cacheStats.redis.hits > this.cacheStats.memory.hits
      }
    };
  }

  // 캐시 상태 체크
  async healthCheck() {
    const stats = await this.getStats();
    
    return {
      status: redisManager.isReady() ? 'healthy' : 'degraded',
      redis: {
        connected: stats.redis.connected,
        errors: stats.redis.errors
      },
      memory: {
        usage: `${stats.memory.size}/${stats.memory.maxSize}`,
        hitRate: stats.total.hitRate
      },
      recommendations: this._getRecommendations(stats)
    };
  }

  // 성능 권장사항
  _getRecommendations(stats) {
    const recommendations = [];
    
    if (!stats.redis.connected) {
      recommendations.push('Redis 서버 연결을 확인하세요');
    }
    
    if (parseFloat(stats.total.hitRate) < 70) {
      recommendations.push('캐시 히트율이 낮습니다. TTL 설정을 검토하세요');
    }
    
    if (stats.memory.size >= stats.memory.maxSize * 0.9) {
      recommendations.push('메모리 캐시 크기를 늘리는 것을 고려하세요');
    }
    
    if (stats.redis.errors > 10) {
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

