import express from 'express';
import Character from '../models/Character.js';
import Work from '../models/Work.js'; // Work 모델 추가

const router = express.Router();
const WORKS_SELECT_FIELDS = 'id title type image releaseDate';
const WORK_NAME_REGEX_OPTIONS = 'i';
const ERROR_RESPONSE_CODES = {
  MISSING_FIELDS: 'MISSING_FIELDS',
  DUPLICATE_ID: 'DUPLICATE_ID',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CHARACTER_NOT_FOUND: 'CHARACTER_NOT_FOUND',
};

function buildErrorResponse(code, message) {
  return { error: { code, message } };
}

function sendInternalError(res, message, error, context) {
  console.error(`${context}:`, error);
  return res.status(500).json(buildErrorResponse(ERROR_RESPONSE_CODES.INTERNAL_ERROR, message));
}

function hasRequiredCharacterFields(characterData) {
  return Boolean(characterData?.id && characterData?.name);
}

async function findCharacterByPublicId(characterId) {
  return Character.findOne({ id: characterId });
}

async function findWorksByCharacterObjectId(characterObjectId) {
  return Work.find({ characterIds: characterObjectId }).select(WORKS_SELECT_FIELDS);
}

async function findWorksByCharacterName(characterName) {
  return Work.find({
    characters: { $regex: characterName, $options: WORK_NAME_REGEX_OPTIONS },
  }).select(WORKS_SELECT_FIELDS);
}

async function findWorksWithFlexibleQuery(character) {
  return Work.find({
    $or: [
      { characterIds: character._id },
      { characters: { $regex: character.name, $options: WORK_NAME_REGEX_OPTIONS } },
      { characters: { $regex: `.*${character.name}.*`, $options: WORK_NAME_REGEX_OPTIONS } },
    ],
  }).select(WORKS_SELECT_FIELDS);
}

async function findCharacterWorks(character) {
  let works = await findWorksByCharacterObjectId(character._id);
  if (works?.length > 0) return works;

  works = await findWorksByCharacterName(character.name);
  if (works?.length > 0) return works;

  return findWorksWithFlexibleQuery(character);
}

// 전체 등장인물 리스트
router.get('/', async (req, res) => {
  try {
    const list = await Character.find();
    return res.json(list);
  } catch (error) {
    return sendInternalError(res, '등장인물 목록 조회 중 오류가 발생했습니다.', error, 'Error fetching character list');
  }
});

// 단일 등장인물 상세
router.get('/:id', async (req, res) => {
  try {
    const character = await findCharacterByPublicId(req.params.id);
    if (!character) {
      return res.status(404).json({ message: '등장인물을 찾을 수 없습니다.' });
    }
    return res.json(character);
  } catch (error) {
    return sendInternalError(res, '등장인물 조회 중 오류가 발생했습니다.', error, 'Error fetching character detail');
  }
});

// 새로운 등장인물 추가
router.post('/', async (req, res) => {
  try {
    const characterData = req.body;

    if (!hasRequiredCharacterFields(characterData)) {
      return res.status(400).json(buildErrorResponse(ERROR_RESPONSE_CODES.MISSING_FIELDS, 'id와 name은 필수입니다.'));
    }

    const existingCharacter = await Character.findOne({ id: characterData.id });
    if (existingCharacter) {
      return res.status(409).json(buildErrorResponse(ERROR_RESPONSE_CODES.DUPLICATE_ID, '이미 존재하는 ID입니다.'));
    }

    const newCharacter = new Character(characterData);
    await newCharacter.save();

    res.status(201).json({
      message: '등장인물이 성공적으로 추가되었습니다.',
      character: newCharacter,
    });
  } catch (error) {
    return sendInternalError(res, '등장인물 추가 중 오류가 발생했습니다.', error, 'Error creating character');
  }
});

// 인물이 출현한 작품들 찾기
router.get('/:id/works', async (req, res) => {
  try {
    const characterId = req.params.id;
    const character = await findCharacterByPublicId(characterId);

    if (!character) {
      return res
        .status(404)
        .json(buildErrorResponse(ERROR_RESPONSE_CODES.CHARACTER_NOT_FOUND, '등장인물을 찾을 수 없습니다.'));
    }

    const works = await findCharacterWorks(character);
    console.log(`Character ${character.name} (${characterId}) found ${works.length} works`);

    return res.json(works);
  } catch (error) {
    return sendInternalError(res, '작품 정보를 가져오는 중 오류가 발생했습니다.', error, 'Error fetching character works');
  }
});

export default router;







