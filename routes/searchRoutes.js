// routes/searchRoutes.js
import express from 'express';
import Place from '../models/Place.js';
import Work from '../models/Work.js';
import Character from '../models/Character.js';

// Redis 하이브리드 캐싱 시스템 추가
import { hybridCache } from '../services/cacheService.js';
import redisManager from '../config/redis.js';

const router = express.Router();

// 캐시 설정
const CACHE_NAMESPACE = 'search';
const DEFAULT_TTL = 300; // 5분 (초 단위)

// 캐시 키 생성
const generateCacheKey = (endpoint, query, page = 1, limit = 20) => {
  return `${endpoint}:${encodeURIComponent(query)}:${page}:${limit}`;
};

// 캐시 래퍼 함수들
const searchCache = {
  // 캐시에서 데이터 조회
  async get(key) {
    try {
      return await hybridCache.get(CACHE_NAMESPACE, key);
    } catch (error) {
      console.error('❌ 캐시 조회 오류:', error.message);
      return null;
    }
  },

  // 캐시에 데이터 저장
  async set(key, data, ttl = null) {
    try {
      const cacheTime = ttl || DEFAULT_TTL;
      return await hybridCache.set(CACHE_NAMESPACE, key, data, cacheTime);
    } catch (error) {
      console.error('❌ 캐시 저장 오류:', error.message);
      return false;
    }
  },

  // 캐시 통계
  async getStats() {
    try {
      return await hybridCache.getStats();
    } catch (error) {
      console.error('❌ 캐시 통계 조회 오류:', error.message);
      return { error: error.message };
    }
  },

  // 캐시 초기화
  async clear() {
    try {
      return await hybridCache.delPattern(CACHE_NAMESPACE, '*');
    } catch (error) {
      console.error('❌ 캐시 초기화 오류:', error.message);
      return 0;
    }
  },

  // 캐시 상태 체크
  async healthCheck() {
    try {
      return await hybridCache.healthCheck();
    } catch (error) {
      console.error('❌ 캐시 헬스체크 오류:', error.message);
      return { status: 'error', error: error.message };
    }
  }
};

// Redis 연결 초기화 (비동기)
(async () => {
  try {
    await redisManager.connect();
    console.log('🚀 검색 API Redis 캐싱 시스템 초기화 완료');
  } catch (error) {
    console.log('⚠️  Redis 연결 실패, 메모리 캐시로 동작합니다:', error.message);
  }
})();

// 모니터링 시스템
class SearchMonitor {
  constructor() {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      averageResponseTime: 0,
      slowQueries: [], // 느린 쿼리 추적 (최근 10개)
      popularQueries: new Map(), // 인기 검색어
      errorLog: [], // 최근 에러 로그 (최근 50개)
      hourlyStats: new Map() // 시간대별 통계
    };
    this.startTime = Date.now();
  }

  // 요청 시작 추적
  startRequest(endpoint, query) {
    const requestId = `${endpoint}_${Date.now()}_${Math.random()}`;
    return {
      requestId,
      endpoint,
      query,
      startTime: Date.now(),
      cached: false
    };
  }

  // 요청 완료 추적
  endRequest(requestInfo, cached = false, error = null) {
    const responseTime = Date.now() - requestInfo.startTime;
    
    // 기본 통계 업데이트
    this.stats.totalRequests++;
    
    if (cached) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }

    // 평균 응답 시간 업데이트
    const totalTime = this.stats.averageResponseTime * (this.stats.totalRequests - 1) + responseTime;
    this.stats.averageResponseTime = Math.round(totalTime / this.stats.totalRequests);

    // 느린 쿼리 추적 (1초 이상)
    if (responseTime > 1000) {
      this.stats.slowQueries.push({
        endpoint: requestInfo.endpoint,
        query: requestInfo.query,
        responseTime,
        timestamp: new Date().toISOString(),
        cached
      });
      
      // 최근 10개만 유지
      if (this.stats.slowQueries.length > 10) {
        this.stats.slowQueries.shift();
      }
    }

    // 인기 검색어 추적
    if (requestInfo.query) {
      const count = this.stats.popularQueries.get(requestInfo.query) || 0;
      this.stats.popularQueries.set(requestInfo.query, count + 1);
    }

    // 시간대별 통계
    const hour = new Date().getHours();
    const hourStats = this.stats.hourlyStats.get(hour) || { requests: 0, avgTime: 0 };
    hourStats.requests++;
    hourStats.avgTime = Math.round((hourStats.avgTime * (hourStats.requests - 1) + responseTime) / hourStats.requests);
    this.stats.hourlyStats.set(hour, hourStats);

    // 에러 처리
    if (error) {
      this.stats.errorCount++;
      this.stats.errorLog.push({
        endpoint: requestInfo.endpoint,
        query: requestInfo.query,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        responseTime
      });

      // 최근 50개만 유지
      if (this.stats.errorLog.length > 50) {
        this.stats.errorLog.shift();
      }
    }

    return {
      requestId: requestInfo.requestId,
      responseTime,
      cached,
      error: !!error
    };
  }

  // 통계 조회
  getStats() {
    const uptime = Date.now() - this.startTime;
    const topQueries = Array.from(this.stats.popularQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    const hourlyData = Array.from(this.stats.hourlyStats.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, stats]) => ({ hour, ...stats }));

    return {
      uptime: Math.round(uptime / 1000), // 초 단위
      totalRequests: this.stats.totalRequests,
      cacheHitRate: this.stats.totalRequests > 0 
        ? Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100) 
        : 0,
      averageResponseTime: this.stats.averageResponseTime,
      errorRate: this.stats.totalRequests > 0 
        ? Math.round((this.stats.errorCount / this.stats.totalRequests) * 100) 
        : 0,
      slowQueries: this.stats.slowQueries,
      topQueries,
      hourlyStats: hourlyData,
      recentErrors: this.stats.errorLog.slice(-10) // 최근 10개 에러만
    };
  }

  // 통계 초기화
  reset() {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      averageResponseTime: 0,
      slowQueries: [],
      popularQueries: new Map(),
      errorLog: [],
      hourlyStats: new Map()
    };
    this.startTime = Date.now();
  }
}

// 모니터링 인스턴스 생성
const searchMonitor = new SearchMonitor();

// 고도화된 에러 처리 시스템
class SearchError extends Error {
  constructor(code, message, details = null, statusCode = 400) {
    super(message);
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

// 에러 처리 헬퍼 함수
function handleSearchError(error, req, res, requestInfo = null) {
  console.error('Search API Error:', {
    error: error.message,
    stack: error.stack,
    query: req.query.q,
    path: req.path,
    timestamp: new Date().toISOString()
  });

  // 모니터링에 에러 기록
  if (requestInfo) {
    searchMonitor.endRequest(requestInfo, false, error);
  }

  // SearchError 인스턴스인 경우
  if (error instanceof SearchError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp
      }
    });
  }

  // MongoDB 관련 에러
  if (error.name === 'MongoError' || error.name === 'MongooseError') {
    return res.status(503).json({
      error: {
        code: 'DATABASE_ERROR',
        message: '데이터베이스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date().toISOString()
      }
    });
  }

  // 타임아웃 에러
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return res.status(408).json({
      error: {
        code: 'REQUEST_TIMEOUT',
        message: '요청 시간이 초과되었습니다. 검색어를 더 구체적으로 입력해보세요.',
        timestamp: new Date().toISOString()
      }
    });
  }

  // 일반적인 서버 에러
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      timestamp: new Date().toISOString()
    }
  });
}

// 검색어 유효성 검사
function validateSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    throw new SearchError(
      'INVALID_QUERY',
      '검색어를 입력해주세요.',
      { query, type: typeof query }
    );
  }

  const trimmedQuery = query.trim();
  
  if (trimmedQuery.length === 0) {
    throw new SearchError(
      'EMPTY_QUERY',
      '검색어를 입력해주세요.',
      { originalLength: query.length }
    );
  }

  if (trimmedQuery.length < 2) {
    throw new SearchError(
      'QUERY_TOO_SHORT',
      '검색어는 2글자 이상 입력해주세요.',
      { length: trimmedQuery.length, minLength: 2 }
    );
  }

  if (trimmedQuery.length > 100) {
    throw new SearchError(
      'QUERY_TOO_LONG',
      '검색어는 100글자 이하로 입력해주세요.',
      { length: trimmedQuery.length, maxLength: 100 }
    );
  }

  // 특수문자만으로 구성된 검색어 체크
  if (!/[가-힣a-zA-Z0-9]/.test(trimmedQuery)) {
    throw new SearchError(
      'INVALID_CHARACTERS',
      '한글, 영문, 숫자를 포함한 검색어를 입력해주세요.',
      { query: trimmedQuery }
    );
  }

  return trimmedQuery;
}

// 페이지네이션 파라미터 유효성 검사
function validatePaginationParams(page, limit) {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));

  if (validatedPage > 1000) {
    throw new SearchError(
      'PAGE_TOO_HIGH',
      '페이지 번호가 너무 큽니다. 더 구체적인 검색어를 사용해보세요.',
      { requestedPage: page, maxPage: 1000 }
    );
  }

  return { page: validatedPage, limit: validatedLimit };
}

// 사용하지 않는 통합 검색 API와 디버깅 API 제거됨
// 이제 새로운 명세 기반 검색 API만 사용

/**
 * ============= 새로운 명세 기반 검색 API =============
 * /api/search/counts?q=키워드
 * /api/search/places?q=키워드
 * /api/search/works?q=키워드
 * /api/search/characters?q=키워드
 * /api/search/suggest?q=키워드
 */

// 공통: 검색어 파싱 + 정규식
function parseQuery(q) {
  const query = (q || '').trim();
  if (!query) return { query: '', regex: null, terms: [] };
  
  // 특수문자 이스케이프 처리
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedQuery, 'i');
  
  // 검색어를 공백으로 분리 (다중 키워드 검색)
  const terms = query.split(/\s+/).filter(term => term.length > 0);
  
  return { query, regex, terms };
}

// 검색 결과 점수 계산 함수
function calculateSearchScore(item, searchTerms, fields) {
  let totalScore = 0;
  
  fields.forEach(field => {
    const text = (item[field] || '').toLowerCase();
    if (!text) return;
    
    searchTerms.forEach(term => {
      const lowerTerm = term.toLowerCase();
      
      // 정확한 매칭 (가장 높은 점수)
      if (text === lowerTerm) {
        totalScore += 100;
      }
      // 시작 부분 매칭
      else if (text.startsWith(lowerTerm)) {
        totalScore += 50;
      }
      // 포함 매칭
      else if (text.includes(lowerTerm)) {
        totalScore += 25;
      }
      // 단어 경계에서의 매칭 (부분 가산)
      else if (text.split(/\s+/).some(word => word.startsWith(lowerTerm))) {
        totalScore += 15;
      }
    });
  });
  
  return totalScore;
}

// 검색 결과 정렬 함수
function sortSearchResults(results, searchTerms, fields) {
  return results.map(item => ({
    ...item,
    _searchScore: calculateSearchScore(item, searchTerms, fields)
  }))
  .sort((a, b) => {
    // 점수가 높은 순으로 정렬
    if (b._searchScore !== a._searchScore) {
      return b._searchScore - a._searchScore;
    }
    // 점수가 같으면 이름/제목 순으로 정렬
    const aName = a.name || a.title || a.real_name || a.fictional_name || '';
    const bName = b.name || b.title || b.real_name || b.fictional_name || '';
    return aName.localeCompare(bName, 'ko');
  })
  .map(({ _searchScore, ...item }) => item); // 점수 제거하고 반환
}

// 헬퍼 함수들은 각 API에서 직접 쿼리를 사용하도록 변경됨
// 페이지네이션과 성능 최적화를 위해 인라인 쿼리 사용

// GET /api/search/counts
router.get('/counts', async (req, res) => {
  const requestInfo = searchMonitor.startRequest('counts', req.query.q);
  
  try {
    // 검색어 유효성 검사
    const validatedQuery = validateSearchQuery(req.query.q);
    const { query, regex } = parseQuery(validatedQuery);
    
    if (!regex) {
      searchMonitor.endRequest(requestInfo, false);
      return res.json({ query, places: 0, works: 0, characters: 0 });
    }

    // 캐시 확인
    const cacheKey = generateCacheKey('counts', query);
    const cached = await searchCache.get(cacheKey);
    if (cached) {
      searchMonitor.endRequest(requestInfo, true);
      return res.json({ ...cached, cached: true });
    }

    // 1) 직접 매칭: 장소/작품/인물
    const [directPlaces, directCharacters, worksByTitle] = await Promise.all([
      Place.find({ $or: [{ address: regex }, { fictional_name: regex }, { real_name: regex }] }).select('_id'),
      Character.find({ name: regex }).select('_id'),
      Work.find({ title: regex }).select('placeIds characterIds')
    ]);

    // 2) 작품 확장: 장소/인물
    const placeIdSet = new Set();
    const charIdSet = new Set();
    worksByTitle.forEach(w => {
      (w.placeIds || []).forEach(pid => placeIdSet.add(String(pid._id || pid)));
      (w.characterIds || []).forEach(cid => charIdSet.add(String(cid._id || cid)));
    });

    directPlaces.forEach(p => placeIdSet.add(String(p._id)));
    directCharacters.forEach(c => charIdSet.add(String(c._id)));

    const result = {
      query,
      places: placeIdSet.size,
      works: worksByTitle.length,
      characters: charIdSet.size,
      cached: false
    };

    await searchCache.set(cacheKey, result);
    searchMonitor.endRequest(requestInfo, false);
    res.json(result);
  } catch (e) {
    handleSearchError(e, req, res, requestInfo);
  }
});

// GET /api/search/places
router.get('/places', async (req, res) => {
  const requestInfo = searchMonitor.startRequest('places', req.query.q);
  
  try {
    const validatedQuery = validateSearchQuery(req.query.q);
    const { query, regex, terms } = parseQuery(validatedQuery);
    const { page, limit } = validatePaginationParams(req.query.page, req.query.limit);
    const skip = (page - 1) * limit;

    if (!regex) {
      searchMonitor.endRequest(requestInfo, false);
      return res.json([]);
    }

    const cacheKey = generateCacheKey('places', query, page, limit);
    const cached = await searchCache.get(cacheKey);
    if (cached) { searchMonitor.endRequest(requestInfo, true); return res.json(cached); }

    // 1) 직접 장소 매칭 (주소/가명/실명)
    const directPlaces = await Place.find({
      $or: [{ address: regex }, { fictional_name: regex }, { real_name: regex }]
    }).select('id real_name fictional_name address image mapUrl');

    // 2) 작품 제목 매칭 → 해당 placeIds
    const matchedWorks = await Work.find({ title: regex }).select('placeIds title');
    const placeIdsFromWorks = new Set();
    matchedWorks.forEach(w => (w.placeIds || []).forEach(pid => placeIdsFromWorks.add(String(pid._id || pid))));
    const relatedPlaces = placeIdsFromWorks.size
      ? await Place.find({ _id: { $in: Array.from(placeIdsFromWorks) } }).select('id real_name fictional_name address image mapUrl')
      : [];

    // 3) 병합 + 중복 제거
    const mergedMap = new Map();
    [...directPlaces, ...relatedPlaces].forEach(p => { const k = String(p._id || p.id); if (!mergedMap.has(k)) mergedMap.set(k, p); });
    const mergedPlaces = Array.from(mergedMap.values());

    // 정렬 + 페이지
    const sorted = sortSearchResults(mergedPlaces.map(p => (p.toObject ? p.toObject() : p)), terms, ['real_name','fictional_name','address']);
    const pageItems = sorted.slice(skip, skip + limit);

    // 관련 작품 title 주입
    const placeIdList = pageItems.map(p => p._id || p.id);
    const works = placeIdList.length ? await Work.find({ placeIds: { $in: placeIdList } }).select('id title placeIds') : [];
    const byPlace = new Map();
    works.forEach(w => (w.placeIds || []).forEach(pid => { const key = String(pid._id || pid); if (!byPlace.has(key)) byPlace.set(key, { id: w.id, title: w.title }); }));
    const withWorkInfo = pageItems.map(p => { const o = p.toObject ? p.toObject() : p; const wi = byPlace.get(String(o._id || o.id)); return wi ? { ...o, workInfo: wi } : o; });

    await searchCache.set(cacheKey, withWorkInfo);
    searchMonitor.endRequest(requestInfo, false);
    res.json(withWorkInfo);
  } catch (e) {
    handleSearchError(e, req, res, requestInfo);
  }
});

// GET /api/search/works
router.get('/works', async (req, res) => {
  const requestInfo = searchMonitor.startRequest('works', req.query.q);
  
  try {
    const validatedQuery = validateSearchQuery(req.query.q);
    const { query, regex } = parseQuery(validatedQuery);
    const { page, limit } = validatePaginationParams(req.query.page, req.query.limit);
    const skip = (page - 1) * limit;

    if (!regex) { searchMonitor.endRequest(requestInfo, false); return res.json([]); }

    const cacheKey = generateCacheKey('works', query, page, limit);
    const cached = await searchCache.get(cacheKey);
    if (cached) { searchMonitor.endRequest(requestInfo, true); return res.json(cached); }

    // 작품은 제목으로만 검색
    const searchQuery = { title: regex };

    const [total, works] = await Promise.all([
      Work.countDocuments(searchQuery),
      Work.find(searchQuery)
        .select('id title type releaseDate description image characters characterIds placeIds')
        .populate('placeIds', 'id real_name fictional_name address image')
        .populate('characterIds', 'id name job image')
        .skip(skip)
        .limit(limit)
    ]);

    const formattedWorks = works.map(w => ({ ...w.toObject(), placeIds: (w.placeIds || []).map(p => p._id || p), characterIds: (w.characterIds || []).map(c => c._id || c) }));

    await searchCache.set(cacheKey, formattedWorks);
    searchMonitor.endRequest(requestInfo, false);
    res.json(formattedWorks);
  } catch (e) { handleSearchError(e, req, res, requestInfo); }
});

// GET /api/search/characters (확장 버전)
router.get('/characters', async (req, res) => {
  const requestInfo = searchMonitor.startRequest('characters', req.query.q);
  try {
    const validatedQuery = validateSearchQuery(req.query.q);
    const { query, regex, terms } = parseQuery(validatedQuery);
    const { page, limit } = validatePaginationParams(req.query.page, req.query.limit);
    const skip = (page - 1) * limit;

    if (!regex) { searchMonitor.endRequest(requestInfo, false); return res.json([]); }

    const cacheKey = generateCacheKey('characters', query, page, limit);
    const cached = await searchCache.get(cacheKey);
    if (cached) { searchMonitor.endRequest(requestInfo, true); return res.json(cached); }

    // 1) 직접 인물 매칭: 이름만
    const direct = await Character.find({ name: regex }).select('id name image job birth birthDate birthPlace nationality description');

    // 2) 작품 제목 매칭 → characterIds 확장
    const matchedWorks = await Work.find({ title: regex }).select('characterIds');
    const charSet = new Set();
    matchedWorks.forEach(w => (w.characterIds || []).forEach(cid => charSet.add(String(cid._id || cid))));
    const fromWorks = charSet.size ? await Character.find({ _id: { $in: Array.from(charSet) } }).select('id name image job birth birthDate birthPlace nationality description') : [];

    // 병합 + 정렬 + 페이지
    const mergedMap = new Map();
    [...direct, ...fromWorks].forEach(c => { const k = String(c._id || c.id); if (!mergedMap.has(k)) mergedMap.set(k, c); });
    const merged = Array.from(mergedMap.values()).map(c => (c.toObject ? c.toObject() : c));
    const sorted = sortSearchResults(merged, terms, ['name']);
    const pageItems = sorted.slice(skip, skip + limit);

    await searchCache.set(cacheKey, pageItems);
    searchMonitor.endRequest(requestInfo, false);
    res.json(pageItems);
  } catch (e) {
    handleSearchError(e, req, res, requestInfo);
  }
});

// GET /api/search/suggest
router.get('/suggest', async (req, res) => {
  try {
    const { query, regex } = parseQuery(req.query.q);
    if (!regex) return res.json({ query, suggestions: [] });

    // 캐시 확인
    const cacheKey = generateCacheKey('suggest', query);
    const cached = await searchCache.get(cacheKey);
    if (cached) {
      return res.json(cached); // 🔧 캐시된 결과 그대로 반환
    }

    // 각 타입별로 최적화된 쿼리 실행 (상위 5개씩만)
    const [places, works, characters] = await Promise.all([
      Place.find({
        $or: [
          { real_name: regex },
          { fictional_name: regex },
          { address: regex }
        ]
      }).select('real_name fictional_name address').limit(5),
      
      Work.find({
        $or: [
          { title: regex }
        ]
      }).select('title').limit(5),
      
      Character.find({
        $or: [
          { name: regex }
        ]
      }).select('name').limit(5)
    ]);

    // 적합한 라벨 선택: 주소가 매칭되면 주소 우선, 그 외 실명/가명
    const bestPlaceLabel = (p, q) => {
      const lower = q.toLowerCase();
      const fields = [
        { key: 'address', value: p.address || '' },
        { key: 'real_name', value: p.real_name || '' },
        { key: 'fictional_name', value: p.fictional_name || '' }
      ];
      // 점수: 일치 > 접두사 > 포함
      const score = (text) => {
        const t = (text || '').toLowerCase();
        if (!t) return -1;
        if (t === lower) return 3;
        if (t.startsWith(lower)) return 2;
        if (t.includes(lower)) return 1;
        return 0;
      };
      let best = fields[0].value;
      let bestScore = score(fields[0].value);
      for (let i = 1; i < fields.length; i++) {
        const s = score(fields[i].value);
        if (s > bestScore) {
          bestScore = s;
          best = fields[i].value;
        }
      }
      return best || p.real_name || p.fictional_name || p.address || '';
    };

    const suggestions = [
      ...places.map(p => ({ type: 'place', label: bestPlaceLabel(p, query) })),
      ...works.map(w => ({ type: 'work', label: w.title })),
      ...characters.map(c => ({ type: 'character', label: c.name }))
    ];

    const result = { query, suggestions };

    // 캐시에 저장
    await searchCache.set(cacheKey, result);

    res.json(result);
  } catch (e) {
    console.error('Search suggest error:', e);
    res.status(500).json({ 
      error: { 
        code: 'INTERNAL_SERVER_ERROR', 
        message: '검색 제안 중 오류가 발생했습니다.' 
      } 
    });
  }
});

// 모니터링 API
router.get('/monitor/stats', async (req, res) => {
  try {
    const searchStats = searchMonitor.getStats();
    const cacheStats = await searchCache.getStats();
    
    res.json({
      search: searchStats,
      cache: cacheStats,
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: '모니터링 통계 조회 실패',
      message: error.message
    });
  }
});

router.delete('/monitor/reset', (req, res) => {
  const beforeStats = searchMonitor.getStats();
  searchMonitor.reset();
  
  res.json({
    message: '모니터링 통계가 초기화되었습니다.',
    previousStats: beforeStats
  });
});

// 캐시 관리 API (개발/모니터링용)
router.get('/cache/stats', async (req, res) => {
  try {
    const stats = await searchCache.getStats();
    res.json({
      ...stats,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: '캐시 통계 조회 실패',
      message: error.message
    });
  }
});

router.delete('/cache/clear', async (req, res) => {
  try {
    const cleared = await searchCache.clear();
    res.json({
      message: '캐시가 초기화되었습니다.',
      clearedItems: cleared,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: '캐시 초기화 실패',
      message: error.message
    });
  }
});

export default router;
