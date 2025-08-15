// routes/workRoutes.js

import express from 'express';
import Work from '../models/Work.js';

const router = express.Router();

// 1) 모든 작품 조회
router.get('/', async (req, res) => {
  try {
    const works = await Work.find();
    res.json(works);
  } catch (error) {
    console.error('Error fetching works:', error);
    res.status(500).json({ message: '작품을 불러오는 중 오류 발생' });
  }
});

// 2) 특정 작품 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const work = await Work.findOne({ id: req.params.id })
      .populate('characterIds')
      .populate('placeIds'); // 촬영지 정보 추가

    if (!work) {
      return res.status(404).json({ message: '작품을 찾을 수 없습니다.' });
    }
    res.json(work);
  } catch (error) {
    console.error('Error fetching work:', error);
    res.status(500).json({ message: '작품 조회 중 오류 발생' });
  }
});

export default router;
