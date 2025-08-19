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

// 새로운 등장인물 추가
router.post('/', async (req, res) => {
  try {
    const characterData = req.body;
    
    // 필수 필드 검증
    if (!characterData.id || !characterData.name) {
      return res.status(400).json({ 
        error: { 
          code: 'MISSING_FIELDS', 
          message: 'id와 name은 필수입니다.' 
        } 
      });
    }
    
    // ID 중복 검사
    const existingCharacter = await Character.findOne({ id: characterData.id });
    if (existingCharacter) {
      return res.status(409).json({ 
        error: { 
          code: 'DUPLICATE_ID', 
          message: '이미 존재하는 ID입니다.' 
        } 
      });
    }
    
    // 새 등장인물 생성
    const newCharacter = new Character(characterData);
    await newCharacter.save();
    
    res.status(201).json({
      message: '등장인물이 성공적으로 추가되었습니다.',
      character: newCharacter
    });
    
  } catch (error) {
    console.error('Error creating character:', error);
    res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: '등장인물 추가 중 오류가 발생했습니다.' 
      } 
    });
  }
});

export default router;







