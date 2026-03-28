// routes/workRoutes.js

import express from 'express';
import Work from '../models/Work.js';

const router = express.Router();
const WORK_ERROR_MESSAGES = {
  FETCH_LIST: '작품을 불러오는 중 오류 발생',
  NOT_FOUND: '작품을 찾을 수 없습니다.',
  FETCH_SINGLE: '작품 조회 중 오류 발생',
};

function sendWorkServerError(res, message, error, context) {
  console.error(`${context}:`, error);
  return res.status(500).json({ message });
}

function queryWorkByPublicId(workId) {
  return Work.findOne({ id: workId }).populate('characterIds').populate('placeIds');
}

// 1) 모든 작품 조회
router.get('/', async (req, res) => {
  try {
    const works = await Work.find();
    return res.json(works);
  } catch (error) {
    return sendWorkServerError(res, WORK_ERROR_MESSAGES.FETCH_LIST, error, 'Error fetching works');
  }
});

// 2) 특정 작품 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const work = await queryWorkByPublicId(req.params.id);

    if (!work) {
      return res.status(404).json({ message: WORK_ERROR_MESSAGES.NOT_FOUND });
    }
    return res.json(work);
  } catch (error) {
    return sendWorkServerError(res, WORK_ERROR_MESSAGES.FETCH_SINGLE, error, 'Error fetching work');
  }
});

export default router;
