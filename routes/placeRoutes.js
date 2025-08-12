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

    const places = await Place.find(filter);
    return res.json(places);
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
