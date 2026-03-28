import express from 'express';
import Character from '../models/Character.js';
import Work from '../models/Work.js'; // Work 모델 추가

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

// 인물이 출현한 작품들 찾기
router.get('/:id/works', async (req, res) => {
  try {
    const characterId = req.params.id;
    
    // 해당 인물 찾기
    const character = await Character.findOne({ id: characterId });
    if (!character) {
      return res.status(404).json({ 
        error: { 
          code: 'CHARACTER_NOT_FOUND', 
          message: '등장인물을 찾을 수 없습니다.' 
        } 
      });
    }
    
    // 방법 1: characterIds로 직접 연결된 작품들 찾기
    let works = await Work.find({
      characterIds: character._id
    }).select('id title type image releaseDate');
    
    // 방법 2: characters 배열에서 이름으로 검색 (characterIds가 비어있는 경우)
    if (!works || works.length === 0) {
      works = await Work.find({
        characters: { $regex: character.name, $options: 'i' }
      }).select('id title type image releaseDate');
    }
    
    // 방법 3: 더 유연한 검색 (부분 일치)
    if (!works || works.length === 0) {
      works = await Work.find({
        $or: [
          { characterIds: character._id },
          { characters: { $regex: character.name, $options: 'i' } },
          { characters: { $regex: `.*${character.name}.*`, $options: 'i' } }
        ]
      }).select('id title type image releaseDate');
    }
    
    // 디버깅 정보 추가
    console.log(`Character ${character.name} (${characterId}) found ${works.length} works`);
    
    res.json(works);
    
  } catch (error) {
    console.error('Error fetching character works:', error);
    res.status(500).json({ 
      error: { 
        code: 'INTERNAL_ERROR', 
        message: '작품 정보를 가져오는 중 오류가 발생했습니다.' 
      } 
    });
  }
});

export default router;







