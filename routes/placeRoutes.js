// routes/placeRoutes.js

import express from 'express';
import Place   from '../models/Place.js';
import Work    from '../models/Work.js';

const router = express.Router();

/**
 * 1) 전체 장소 조회 (검색 기능 포함)
 */
router.get('/', async (req, res) => {
  try {
    const { query } = req.query;
    let filter = {};

    if (query) {
      const regex = new RegExp(query, 'i');

      // 작품에서 제목 매칭된 ID 모으기
      const matched = await Work.find({ title: regex }).select('id');
      const workIds = matched.map(w => w.id);

      filter = {
        $or: [
          { real_name:      regex },
          { fictional_name: regex },
          { address:        regex },
          { workId:        { $in: workIds } }
        ]
      };
    }

    // const places = await Place.find(filter); // 기존 find() 로직 대신 aggregation 사용
    
    // Aggregation 파이프라인: places 컬렉션에 work 정보 Join
    const placesWithWorks = await Place.aggregate([
      { $match: filter }, // 검색어가 있으면 필터링 적용
      {
        $lookup: {
          from: 'works', // Join할 컬렉션 (Work 모델 -> works)
          localField: 'workId', // Place 컬렉션의 필드
          foreignField: 'id',   // works 컬렉션의 필드
          as: 'workInfo'      // Join된 정보가 저장될 필드 이름
        }
      },
      {
        $unwind: { // workInfo 배열을 객체로 변환
          path: '$workInfo',
          preserveNullAndEmptyArrays: true // work 정보가 없는 장소도 결과에 포함
        }
      }
    ]);

    return res.json(placesWithWorks);
  } catch (error) {
    console.error('Error fetching places:', error);
    return res.status(500).json({ message: '장소를 불러오는 중 오류 발생' });
  }
});

/**
 * 2) 단일 장소 조회
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const place = await Place.findOne({ id });

    if (!place) {
      return res
        .status(404)
        .json({ message: '해당하는 장소를 찾을 수 없습니다.' });
    }

    return res.json(place);
  } catch (error) {
    console.error('Error fetching single place:', error);
    return res.status(500).json({ message: '장소 조회 중 오류 발생' });
  }
});

export default router;
