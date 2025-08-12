import express from 'express';
import Character from '../models/Character.js';

const router = express.Router();

// 전체 등장인물 리스트
router.get('/', async (req, res) => {
  const list = await Character.find();
  res.json(list);
});

// 단일 등장인물 상세
router.get('/:id', async (req, res) => {
  const c = await Character.findOne({ id: req.params.id });
  if (!c) return res.status(404).json({ message: '등장인물을 찾을 수 없습니다.' });
  res.json(c);
});

export default router;





