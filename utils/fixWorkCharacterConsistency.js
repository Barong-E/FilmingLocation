// utils/fixWorkCharacterConsistency.js
import Work from '../models/Work.js';
import Character from '../models/Character.js';

/**
 * 작품의 characterIds와 characters 배열 일치성 복구
 * @param {string} workId - 작품 ID
 * @returns {Object} 복구 결과
 */
export async function fixWorkCharacterConsistency(workId) {
  try {
    const work = await Work.findById(workId);
    if (!work) {
      return { success: false, error: '작품을 찾을 수 없습니다.' };
    }

    const { characterIds, characters } = work;
    
    // characterIds를 기준으로 characters 재구성
    const fixedCharacters = [];
    
    for (const charId of characterIds) {
      const character = await Character.findById(charId);
      if (character) {
        // 기존 characters에서 해당 인물의 극중이름 찾기
        const existingChar = characters.find(char => 
          char.includes(character.name) || char.includes(character.name.split('(')[0])
        );
        
        if (existingChar) {
          // 기존 극중이름 유지
          fixedCharacters.push(existingChar);
        } else {
          // 기본 이름 사용
          fixedCharacters.push(character.name);
        }
      } else {
        // 인물을 찾을 수 없으면 기본값
        fixedCharacters.push('알 수 없는 인물');
      }
    }

    // 수정된 데이터로 업데이트
    await Work.findByIdAndUpdate(workId, {
      characters: fixedCharacters
    });

    return {
      success: true,
      message: '데이터 일치성 복구 완료',
      details: {
        originalCharacters: characters,
        fixedCharacters: fixedCharacters,
        characterIds: characterIds.map(id => id.toString())
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `복구 중 오류 발생: ${error.message}`
    };
  }
}

/**
 * 모든 작품의 characterIds와 characters 일치성 복구
 * @returns {Array} 복구 결과 배열
 */
export async function fixAllWorksConsistency() {
  try {
    const works = await Work.find({}).select('_id title characterIds characters');
    const results = [];

    for (const work of works) {
      const fixResult = await fixWorkCharacterConsistency(work._id);
      results.push({
        workId: work._id,
        title: work.title,
        ...fixResult
      });
    }

    return results;
  } catch (error) {
    return [{
      workId: null,
      title: '전체 복구',
      success: false,
      error: `전체 복구 중 오류 발생: ${error.message}`
    }];
  }
}
