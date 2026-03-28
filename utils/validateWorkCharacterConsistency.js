// utils/validateWorkCharacterConsistency.js
import Work from '../models/Work.js';

/**
 * 작품의 characterIds와 characters 배열 일치성 검증
 * @param {string} workId - 작품 ID
 * @returns {Object} 검증 결과
 */
export async function validateWorkCharacterConsistency(workId) {
  try {
    const work = await Work.findById(workId);
    if (!work) {
      return { isValid: false, error: '작품을 찾을 수 없습니다.' };
    }

    const { characterIds, characters } = work;
    
    // 길이 일치 확인
    if (characterIds.length !== characters.length) {
      return {
        isValid: false,
        error: `배열 길이 불일치: characterIds(${characterIds.length}) vs characters(${characters.length})`,
        details: {
          characterIds: characterIds.map(id => id.toString()),
          characters: characters
        }
      };
    }

    // 각 인덱스별 매칭 확인
    const mismatches = [];
    for (let i = 0; i < characterIds.length; i++) {
      const charId = characterIds[i];
      const charName = characters[i];
      
      // characterIds[i]에 해당하는 인물 정보 조회
      const character = await Character.findById(charId);
      if (!character) {
        mismatches.push({
          index: i,
          characterId: charId.toString(),
          characterName: charName,
          error: '인물을 찾을 수 없습니다.'
        });
        continue;
      }

      // characters[i]가 해당 인물의 이름을 포함하는지 확인
      const expectedName = character.name;
      if (!charName.includes(expectedName)) {
        mismatches.push({
          index: i,
          characterId: charId.toString(),
          characterName: charName,
          expectedName: expectedName,
          error: '인물 이름이 일치하지 않습니다.'
        });
      }
    }

    return {
      isValid: mismatches.length === 0,
      error: mismatches.length > 0 ? '인덱스별 매칭 오류' : null,
      details: mismatches
    };

  } catch (error) {
    return {
      isValid: false,
      error: `검증 중 오류 발생: ${error.message}`
    };
  }
}

/**
 * 모든 작품의 characterIds와 characters 일치성 검증
 * @returns {Array} 검증 결과 배열
 */
export async function validateAllWorksConsistency() {
  try {
    const works = await Work.find({}).select('_id title characterIds characters');
    const results = [];

    for (const work of works) {
      const validation = await validateWorkCharacterConsistency(work._id);
      results.push({
        workId: work._id,
        title: work.title,
        ...validation
      });
    }

    return results;
  } catch (error) {
    return [{
      workId: null,
      title: '전체 검증',
      isValid: false,
      error: `전체 검증 중 오류 발생: ${error.message}`
    }];
  }
}
