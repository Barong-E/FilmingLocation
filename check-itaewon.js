// 이태원클라쓰 등장인물 조회 스크립트
import mongoose from 'mongoose';
import Work from './models/Work.js';
import Character from './models/Character.js';

async function checkItaewonCharacters() {
  try {
    // MongoDB 연결
    await mongoose.connect('mongodb://localhost:27017/filo');
    console.log('MongoDB 연결 성공');

    // 이태원클라쓰 작품 찾기
    const itaewonWork = await Work.findOne({ 
      title: { $regex: /이태원/i } 
    });

    if (!itaewonWork) {
      console.log('이태원클라쓰 작품을 찾을 수 없습니다.');
      return;
    }

    console.log('\n=== 이태원클라쓰 작품 정보 ===');
    console.log('ID:', itaewonWork._id);
    console.log('제목:', itaewonWork.title);
    console.log('characterIds 개수:', itaewonWork.characterIds.length);
    console.log('characters 배열:', itaewonWork.characters);

    // characterIds에 해당하는 인물들 조회
    if (itaewonWork.characterIds.length > 0) {
      console.log('\n=== 등장인물 목록 ===');
      
      for (let i = 0; i < itaewonWork.characterIds.length; i++) {
        const charId = itaewonWork.characterIds[i];
        const character = await Character.findById(charId);
        
        if (character) {
          const characterName = itaewonWork.characters[i] || '(극중이름 없음)';
          console.log(`${i + 1}. ${character.name} (${character._id}) → 극중이름: ${characterName}`);
        } else {
          console.log(`${i + 1}. [삭제된 인물] (${charId})`);
        }
      }
    } else {
      console.log('등장인물이 없습니다.');
    }

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDB 연결 종료');
  }
}

checkItaewonCharacters();
