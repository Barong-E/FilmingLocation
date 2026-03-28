// routes/placeRoutes.js

import express from 'express';
import mongoose from 'mongoose';
import Place from '../models/Place.js';
import Work from '../models/Work.js';

const router = express.Router();
const PLACE_ERROR_MESSAGES = {
  FETCH_LIST: '장소를 불러오는 중 오류 발생',
  NOT_FOUND: '해당하는 장소를 찾을 수 없습니다.',
  FETCH_SINGLE: '장소 조회 중 오류 발생',
};

function sendServerError(res, message, error, context) {
  console.error(`${context}:`, error);
  return res.status(500).json({ message });
}

function createPlaceAggregationPipeline(searchQuery) {
  const aggregationPipeline = [
    {
      $lookup: {
        from: 'works',
        localField: '_id',
        foreignField: 'placeIds',
        as: 'relatedWorks',
      },
    },
  ];

  if (searchQuery) {
    const regex = new RegExp(searchQuery, 'i');
    aggregationPipeline.push({
      $match: {
        $or: [
          { real_name: regex },
          { fictional_name: regex },
          { address: regex },
          { 'relatedWorks.title': regex },
        ],
      },
    });
  }

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
          in: { _id: '$$w._id', id: '$$w.id', title: '$$w.title' },
        },
      },
    },
  });

  return aggregationPipeline;
}

async function findPlaceByRequestId(placeId) {
  if (mongoose.Types.ObjectId.isValid(placeId)) {
    const placeByObjectId = await Place.findById(placeId);
    if (placeByObjectId) return placeByObjectId;
  }
  return Place.findOne({ id: placeId });
}

/**
 * 1) 전체 장소 조회 (중복 제거 및 작품 배열 포함)
 */
router.get('/', async (req, res) => {
  try {
    const aggregationPipeline = createPlaceAggregationPipeline(req.query.query);
    const places = await Place.aggregate(aggregationPipeline);
    return res.json(places);
  } catch (error) {
    return sendServerError(res, PLACE_ERROR_MESSAGES.FETCH_LIST, error, 'Error fetching places');
  }
});

/**
 * 2) 단일 장소 조회 (새로운 구조)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const place = await findPlaceByRequestId(id);

    if (!place) {
      return res.status(404).json({ message: PLACE_ERROR_MESSAGES.NOT_FOUND });
    }

    const works = await Work.find({ placeIds: place._id }).populate('characterIds');
    const placeObject = place.toObject();
    placeObject.works = works;
    return res.json(placeObject);
  } catch (error) {
    return sendServerError(res, PLACE_ERROR_MESSAGES.FETCH_SINGLE, error, 'Error fetching single place');
  }
});

export default router;

