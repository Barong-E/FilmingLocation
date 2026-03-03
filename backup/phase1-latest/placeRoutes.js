// routes/placeRoutes.js

import express from 'express';
import mongoose from 'mongoose';
import Place from '../models/Place.js';
import Work from '../models/Work.js';

const router = express.Router();

/**
 * 1) 전체 장소 조회 (중복 제거 및 작품 배열 포함)
 */
router.get('/', async (req, res) => {
  try {
    const { query } = req.query;

    const aggregationPipeline = [
      {
        $lookup: {
          from: 'works',
          localField: '_id',
          foreignField: 'placeIds',
          as: 'relatedWorks'
        }
      }
    ];

    if (query) {
      const regex = new RegExp(query, 'i');
      aggregationPipeline.push({
        $match: {
          $or: [
            { real_name: regex },
            { fictional_name: regex },
            { address: regex },
            { 'relatedWorks.title': regex }
          ]
        }
      });
    }

    // 필요한 필드만 반환 + 작품 요약화
    aggregationPipeline.push({
      $project: {
        id: 1,
        real_name: 1,
        fictional_name: 1,
        address: 1,
        image: 1,
        mapUrl: 1,
        createdAt: 1,
        relatedWorks: {
          $map: {
            input: '$relatedWorks',
            as: 'w',
            in: { _id: '$$w._id', id: '$$w.id', title: '$$w.title' }
          }
        }
      }
    });

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
    let place = null;
    
    // 1. ObjectId 형식인지 확인하여 ObjectId로 조회 시도
    if (mongoose.Types.ObjectId.isValid(id)) {
      place = await Place.findById(id);
    }
    
    // 2. ObjectId로 찾지 못했으면 JSON의 id 필드로 조회
    if (!place) {
      place = await Place.findOne({ id: id });
    }

    if (!place) {
      return res.status(404).json({ message: '해당하는 장소를 찾을 수 없습니다.' });
    }

    // 이 장소를 포함하는 모든 작품을 찾고, 등장인물 정보를 populate 함
    const works = await Work.find({ placeIds: place._id }).populate('characterIds');

    const placeObject = place.toObject();
    placeObject.works = works; // 단일 work → works 배열로 변경

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

