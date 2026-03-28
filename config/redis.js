// 🔧 Redis 설정 및 연결 관리
import redis from 'redis';

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  // Redis 클라이언트 초기화
  async connect() {
    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis 서버 연결 거부');
            return new Error('Redis 서버가 실행되지 않았습니다');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('❌ Redis 재연결 시간 초과');
            return new Error('재연결 시간 초과');
          }
          if (options.attempt > 10) {
            console.error('❌ Redis 재연결 시도 횟수 초과');
            return undefined;
          }
          // 재연결 간격 (밀리초)
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // 연결 이벤트 리스너
      this.client.on('connect', () => {
        console.log('🔗 Redis 연결 시도 중...');
      });

      this.client.on('ready', () => {
        console.log('✅ Redis 연결 완료');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis 오류:', err.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis 연결 종료');
        this.isConnected = false;
      });

      // Redis 연결 대기
      await new Promise((resolve, reject) => {
        this.client.on('ready', resolve);
        this.client.on('error', reject);
      });

      console.log('🎉 Redis 연결 성공!');
      return true;
    } catch (error) {
      console.error('❌ Redis 연결 실패:', error.message);
      console.log('⚠️  Redis 없이 메모리 캐시로 동작합니다');
      return false;
    }
  }

  // Redis 연결 상태 확인
  isReady() {
    return this.client && this.isConnected;
  }

  // 키-값 저장
  async set(key, value, expireSeconds = 3600) {
    if (!this.isReady()) return false;
    
    try {
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (expireSeconds) {
        await this.client.setex(key, expireSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Redis SET 오류:', error.message);
      return false;
    }
  }

  // 키로 값 조회
  async get(key) {
    if (!this.isReady()) return null;
    
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      // JSON 파싱 시도
      try {
        return JSON.parse(value);
      } catch {
        return value; // 문자열 그대로 반환
      }
    } catch (error) {
      console.error('❌ Redis GET 오류:', error.message);
      return null;
    }
  }

  // 키 삭제
  async del(key) {
    if (!this.isReady()) return false;
    
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('❌ Redis DEL 오류:', error.message);
      return false;
    }
  }

  // 패턴으로 키 삭제
  async delPattern(pattern) {
    if (!this.isReady()) return 0;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.client.del(...keys);
      return result;
    } catch (error) {
      console.error('❌ Redis DEL PATTERN 오류:', error.message);
      return 0;
    }
  }

  // 키 존재 여부 확인
  async exists(key) {
    if (!this.isReady()) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis EXISTS 오류:', error.message);
      return false;
    }
  }

  // TTL 조회
  async ttl(key) {
    if (!this.isReady()) return -1;
    
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('❌ Redis TTL 오류:', error.message);
      return -1;
    }
  }

  // Redis 통계
  async getStats() {
    if (!this.isReady()) return null;
    
    try {
      const info = await this.client.info();
      const dbsize = await this.client.dbsize();
      
      return {
        connected: true,
        dbsize,
        info: info
      };
    } catch (error) {
      console.error('❌ Redis STATS 오류:', error.message);
      return null;
    }
  }

  // 연결 종료
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('👋 Redis 연결 종료');
    }
  }
}

// 싱글톤 인스턴스 생성
const redisManager = new RedisManager();

export default redisManager;

