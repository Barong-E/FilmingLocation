// routes/searchRoutes.js
import express from 'express';
import Place from '../models/Place.js';
import Work from '../models/Work.js';
import Character from '../models/Character.js';

const router = express.Router();

/**
 * 통합 검색 API - 장소, 작품, 인물을 모두 검색 + 연결된 데이터 포함
 */
router.get('/', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        error: { 
          code: 'MISSING_QUERY', 
          message: '검색어를 입력해주세요.' 
        } 
      });
    }

    const regex = new RegExp(query, 'i');
    console.log(`🔍 검색 시작: "${query}"`);
    
    // 1. 검색어로 모든 타입의 데이터 찾기
    const [matchingWorks, matchingCharacters, matchingPlaces] = await Promise.all([
      // 작품 검색
      Work.find({
        $or: [
          { title: regex },
          { type: regex },
          { description: regex }
        ]
      }).populate('placeIds').populate('characterIds').limit(20),
      
      // 인물 검색
      Character.find({
        $or: [
          { name: regex },
          { job: regex },
          { nationality: regex },
          { description: regex }
        ]
      }).limit(20),
      
      // 장소 검색
      Place.find({
        $or: [
          { real_name: regex },
          { fictional_name: regex },
          { address: regex }
        ]
      }).limit(20)
    ]);
    
    console.log('🔍 검색어와 일치하는 작품들:', matchingWorks.map(w => w.title));
    console.log('🔍 검색어와 일치하는 인물들:', matchingCharacters.map(c => c.name));
    console.log('🔍 검색어와 일치하는 장소들:', matchingPlaces.map(p => p.real_name || p.fictional_name));
    
    // 2. 모든 관련 데이터 수집
    const allWorkIds = new Set();
    const allPlaceIds = new Set();
    const allCharacterIds = new Set();
    
    // 검색된 작품에서 관련 데이터 수집
    matchingWorks.forEach(work => {
      allWorkIds.add(work._id.toString());
      if (work.placeIds) {
        work.placeIds.forEach(p => allPlaceIds.add((p._id || p).toString()));
      }
      if (work.characterIds) {
        work.characterIds.forEach(c => allCharacterIds.add((c._id || c).toString()));
      }
    });
    
    // 검색된 인물에서 관련 데이터 수집
    if (matchingCharacters.length > 0) {
      const characterWorkIds = matchingCharacters.map(c => c._id);
      const characterWorks = await Work.find({
        characterIds: { $in: characterWorkIds }
      }).populate('placeIds').populate('characterIds');
      
      characterWorks.forEach(work => {
        allWorkIds.add(work._id.toString());
        if (work.placeIds) {
          work.placeIds.forEach(p => allPlaceIds.add((p._id || p).toString()));
        }
        if (work.characterIds) {
          work.characterIds.forEach(c => allCharacterIds.add((c._id || c).toString()));
        }
      });
    }
    
    // 검색된 장소에서 관련 데이터 수집
    if (matchingPlaces.length > 0) {
      const placeIds = matchingPlaces.map(p => p._id);
      const placeWorks = await Work.find({
        placeIds: { $in: placeIds }
      }).populate('placeIds').populate('characterIds');
      
      placeWorks.forEach(work => {
        allWorkIds.add(work._id.toString());
        if (work.placeIds) {
          work.placeIds.forEach(p => allPlaceIds.add((p._id || p).toString()));
        }
        if (work.characterIds) {
          work.characterIds.forEach(c => allCharacterIds.add((c._id || c).toString()));
        }
      });
    }
    
    console.log('🔍 수집된 모든 ID:', {
      works: allWorkIds.size,
      places: allPlaceIds.size,
      characters: allCharacterIds.size
    });
    
    // 3. 모든 관련 데이터 가져오기
    const [allWorks, allPlaces, allCharacters] = await Promise.all([
      Work.find({ _id: { $in: Array.from(allWorkIds) } }).populate('placeIds').populate('characterIds'),
      Place.find({ _id: { $in: Array.from(allPlaceIds) } }),
      Character.find({ _id: { $in: Array.from(allCharacterIds) } })
    ]);
    
    // 4. 결과 구성
    const worksWithRelated = allWorks.map(work => ({
      ...work.toObject(),
      relatedPlaces: (work.placeIds || []).map(p => ({
        id: p.id || p._id,
        real_name: p.real_name,
        fictional_name: p.fictional_name,
        address: p.address,
        image: p.image
      })),
      relatedCharacters: (work.characterIds || []).map(c => ({
        id: c.id || c._id,
        name: c.name,
        job: c.job,
        image: c.image
      }))
    }));
    
    const placesWithWorks = allPlaces.map(place => {
      const placeWorks = allWorks.filter(work => 
        work.placeIds && work.placeIds.some(pid => 
          (pid._id || pid).toString() === place._id.toString()
        )
      );
      
      return {
        ...place.toObject(),
        relatedWorks: placeWorks.map(w => ({
          id: w.id,
          title: w.title,
          type: w.type
        }))
      };
    });
    
    const charactersWithWorks = allCharacters.map(character => {
      const characterWorks = allWorks.filter(work => 
        work.characterIds && work.characterIds.some(cid => 
          (cid._id || cid).toString() === character._id.toString()
        )
      );
      
      return {
        ...character.toObject(),
        appearedWorks: characterWorks.map(w => ({
          id: w.id,
          title: w.title,
          type: w.type
        }))
      };
    });
    
    const result = {
      query: query,
      summary: {
        places: placesWithWorks.length,
        works: worksWithRelated.length,
        characters: charactersWithWorks.length,
        total: placesWithWorks.length + worksWithRelated.length + charactersWithWorks.length
      },
      results: {
        places: placesWithWorks,
        works: worksWithRelated,
        characters: charactersWithWorks
      }
    };
    
    console.log('✅ 최종 검색 결과:', {
      places: placesWithWorks.length,
      works: worksWithRelated.length,
      characters: charactersWithWorks.length
    });
    
    // 디버깅: 각 타입별 상세 정보
    if (placesWithWorks.length > 0) {
      console.log('🔍 장소 결과 상세:');
      placesWithWorks.forEach(place => {
        console.log(`  - ${place.real_name || place.fictional_name}: ${place.relatedWorks.map(w => w.title).join(', ')}`);
      });
    }
    
    if (charactersWithWorks.length > 0) {
      console.log('🔍 인물 결과 상세:');
      charactersWithWorks.forEach(character => {
        console.log(`  - ${character.name}: ${character.appearedWorks.map(w => w.title).join(', ')}`);
      });
    }
    
    res.json(result);

  } catch (error) {
    console.error('Error in unified search:', error);
    res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: '검색 중 오류가 발생했습니다.' 
      } 
    });
  }
});

/**
 * 디버깅용: 작품들의 placeIds 상태 확인
 */
router.get('/debug/works', async (req, res) => {
  try {
    const works = await Work.find({}).select('title placeIds');
    const places = await Place.find({}).select('real_name fictional_name');
    
    const result = {
      works: works.map(w => ({
        title: w.title,
        placeIds: w.placeIds?.map(p => p.toString()) || []
      })),
      places: places.map(p => ({
        name: p.real_name || p.fictional_name,
        id: p._id.toString()
      }))
    };
    
    res.json(result);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: 'Debug failed' });
  }
});

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
  if (!query) return { query: '', regex: null };
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return { query, regex };
}

// 장소 검색 필드: real_name, fictional_name, address
async function findPlaces(regex, limit = 50) {
  if (!regex) return [];
  return Place.find({
    $or: [
      { real_name: regex },
      { fictional_name: regex },
      { address: regex }
    ]
  }).limit(limit);
}

// 작품 검색: title, characters[], 그리고 연관 장소명/주소(lookup)
async function findWorks(regex, limit = 50) {
  if (!regex) return [];
  // 1) 기본 필드 검색
  const works1 = await Work.find({
    $or: [
      { title: regex },
      { characters: regex },
      { description: regex }
    ]
  }).populate('placeIds').populate('characterIds').limit(limit);

  // 2) 장소명/주소 lookup 기반 검색
  const places = await findPlaces(regex, 200);
  const placeIds = places.map(p => p._id);
  const works2 = placeIds.length > 0
    ? await Work.find({ placeIds: { $in: placeIds } }).populate('placeIds').populate('characterIds').limit(limit)
    : [];

  // 합치고 중복 제거
  const map = new Map();
  [...works1, ...works2].forEach(w => map.set(w._id.toString(), w));
  return Array.from(map.values());
}

// 인물 검색: name, job, nationality
async function findCharacters(regex, limit = 50) {
  if (!regex) return [];
  return Character.find({
    $or: [
      { name: regex },
      { job: regex },
      { nationality: regex },
      { description: regex }
    ]
  }).limit(limit);
}

// GET /api/search/counts
router.get('/counts', async (req, res) => {
  try {
    const { query, regex } = parseQuery(req.query.q);
    if (!regex) return res.json({ query, places: 0, works: 0, characters: 0 });

    const [places, works, characters] = await Promise.all([
      findPlaces(regex, 1e6),
      findWorks(regex, 1e6),
      findCharacters(regex, 1e6)
    ]);

    res.json({ query, places: places.length, works: works.length, characters: characters.length });
  } catch (e) {
    console.error('counts error', e);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'counts failed' } });
  }
});

// GET /api/search/places
router.get('/places', async (req, res) => {
  try {
    const { regex } = parseQuery(req.query.q);
    const places = await findPlaces(regex, 50);

    // 관련 작품 조회하여 workInfo로 주입 (리스트 렌더러 호환)
    const placeIdList = places.map(p => p._id);
    const works = placeIdList.length > 0
      ? await Work.find({ placeIds: { $in: placeIdList } }).select('id title placeIds')
      : [];

    const byPlaceId = new Map();
    works.forEach(w => {
      (w.placeIds || []).forEach(pid => {
        const key = (pid._id || pid).toString();
        if (!byPlaceId.has(key)) byPlaceId.set(key, { id: w.id, title: w.title });
      });
    });

    const withWorkInfo = places.map(p => {
      const wi = byPlaceId.get(p._id.toString());
      return wi ? { ...p.toObject(), workInfo: wi } : p;
    });

    res.json(withWorkInfo);
  } catch (e) {
    console.error('places error', e);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'places failed' } });
  }
});

// GET /api/search/works
router.get('/works', async (req, res) => {
  try {
    const { regex } = parseQuery(req.query.q);
    const works = await findWorks(regex, 50);
    // 기존 리스트 렌더러가 사용하는 필드 그대로 반환
    res.json(works.map(w => ({
      ...w.toObject(),
      placeIds: (w.placeIds || []).map(p => p._id || p),
      characterIds: (w.characterIds || []).map(c => c._id || c)
    })));
  } catch (e) {
    console.error('works error', e);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'works failed' } });
  }
});

// GET /api/search/characters
router.get('/characters', async (req, res) => {
  try {
    const { regex } = parseQuery(req.query.q);
    const characters = await findCharacters(regex, 50);
    res.json(characters);
  } catch (e) {
    console.error('characters error', e);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'characters failed' } });
  }
});

// GET /api/search/suggest
router.get('/suggest', async (req, res) => {
  try {
    const { query, regex } = parseQuery(req.query.q);
    if (!regex) return res.json({ query, suggestions: [] });

    const [places, works, characters] = await Promise.all([
      findPlaces(regex, 10),
      findWorks(regex, 10),
      findCharacters(regex, 10)
    ]);

    const toLabel = (p) => p.real_name || p.fictional_name || p.address || '';
    const suggestions = [
      ...places.map(p => ({ type: 'place', label: toLabel(p) })),
      ...works.map(w => ({ type: 'work', label: w.title })),
      ...characters.map(c => ({ type: 'character', label: c.name }))
    ];

    res.json({ query, suggestions });
  } catch (e) {
    console.error('suggest error', e);
    res.status(500).json({ error: { code: 'INTERNAL', message: 'suggest failed' } });
  }
});

export default router;
