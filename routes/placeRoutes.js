// routes/placeRoutes.js

import express from 'express';
import mongoose from 'mongoose';
import Place from '../models/Place.js';
import Work from '../models/Work.js';

const router = express.Router();

/**
 * 1) 전체 장소 조회 (새로운 구조)
 */
router.get('/', async (req, res) => {
  try {
    const { query } = req.query;

    // 1. 기본적으로 Place와 Work 정보를 합친다.
    let aggregationPipeline = [
      {
        $lookup: {
          from: 'works',
          localField: '_id',
          foreignField: 'placeIds',
          as: 'workInfo'
        }
      },
      {
        $unwind: {
          path: '$workInfo',
          preserveNullAndEmptyArrays: true // 작품 정보가 없는 장소도 포함
        }
      }
    ];

    // 2. 검색어가 있으면, 합쳐진 데이터를 대상으로 필터링한다.
    if (query) {
      const regex = new RegExp(query, 'i');
      aggregationPipeline.push({
        $match: {
          $or: [
            { real_name: regex },
            { fictional_name: regex },
            { address: regex },
            { 'workInfo.title': regex } // Join된 작품 제목으로 검색
          ]
        }
      });
    }

    const places = await Place.aggregate(aggregationPipeline);
    return res.json(places);
  } catch (error) {
    console.error('Error fetching places:', error);
    return res.status(500).json({ message: '장소를 불러오는 중 오류 발생' });
  }
});

/**
 * 2) 단일 장소 조회 (새로운 구조)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Mongoose의 ObjectId 형식인지 먼저 확인
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: '유효하지 않은 장소 ID 형식입니다.' });
    }
    
    // ObjectId로만 조회
    const place = await Place.findById(id);

    if (!place) {
      return res.status(404).json({ message: '해당하는 장소를 찾을 수 없습니다.' });
    }

    // 이 장소를 포함하는 작품을 찾고, 등장인물 정보를 populate 함
    const work = await Work.findOne({ placeIds: place._id }).populate('characterIds');

    const placeObject = place.toObject();
    placeObject.work = work;

    return res.json(placeObject);

  } catch (error) {
    console.error('Error fetching single place:', error);
    return res.status(500).json({ message: '장소 조회 중 오류 발생' });
  }
});

// 단일 장소 조회 시 중복 로직을 처리하는 헬퍼 함수 (이제 사용 안함)
/*
async function findWorkAndRespond(place, res) {
  // ...
}
*/

export default router;

