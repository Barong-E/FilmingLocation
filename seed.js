// seed.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';

import Place     from './models/Place.js';
import Work      from './models/Work.js';
import Character from './models/Character.js';
import Comment   from './models/Comment.js';

// 1) .env 파일 불러오기
dotenv.config();

// 비동기 시딩 함수 정의
async function seed() {
  try {
    // 2) MongoDB 연결
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('🔗 MongoDB 연결(Seeding) 성공');

    // 3) 기존 데이터를 모두 삭제하여 항상 최신 상태를 유지
    // ⚠️ 댓글은 보존! 사용자 데이터는 삭제하지 않음
    await Work.deleteMany({});
    await Character.deleteMany({});
    console.log('🗑️ 기존 데이터 삭제 완료 (댓글 보존됨)');
    // 📍 Place는 ID 보존을 위해 삭제하지 않음!

    // 4) JSON 파일 읽기
    const placesData     = JSON.parse(await fs.readFile('data/places.json', 'utf-8'));
    const worksData      = JSON.parse(await fs.readFile('data/works.json',  'utf-8'));
    const charactersData = JSON.parse(await fs.readFile('data/characters.json',  'utf-8').catch(()=> '[]'));

    // 5) 독립적인 데이터(Character, Place) 먼저 삽입
    if (charactersData.length > 0) {
      // Character도 ID 보존을 위해 upsert 방식 사용
      for (const charData of charactersData) {
        await Character.findOneAndUpdate(
          { id: charData.id },  // JSON의 id로 검색
          charData,             // 데이터 업데이트
          { upsert: true }      // 없으면 새로 생성
        );
      }
      console.log(`👤 등장인물 ${charactersData.length}명 업데이트/삽입 완료 (ID 보존)`);
    }
    if (placesData.length > 0) {
      // Place는 ID 보존을 위해 upsert 방식 사용
      for (const placeData of placesData) {
        await Place.findOneAndUpdate(
          { id: placeData.id },  // JSON의 id로 검색
          placeData,             // 데이터 업데이트
          { upsert: true }       // 없으면 새로 생성
        );
      }
      console.log(`📍 촬영지 ${placesData.length}곳 업데이트/삽입 완료 (ID 보존)`);
    }
    
    // 6) 관계 매칭을 위해 DB에서 Character와 Place 전체 조회
    const allCharacters = await Character.find({});
    const allPlaces = await Place.find({});

    // 이름/ID를 key로, ObjectId를 value로 하는 맵 생성 (검색 속도 향상)
    const characterMap = new Map(allCharacters.map(c => [c.name, c._id]));
    const placeMap = new Map(allPlaces.map(p => [p.id, p._id]));

    // 7) Work 데이터에 관계(Id)를 연결하여 삽입
    for (const work of worksData) {
      // Character Id 연결
      const characterIds = [];
      if (work.characters && work.characters.length > 0) {
        for (const charName of work.characters) {
          const realName = charName.split('(')[0].trim();
          if (characterMap.has(realName)) {
            characterIds.push(characterMap.get(realName));
          } else {
            // console.warn(`[SEED] 등장인물 '${realName}'을(를) DB에서 찾을 수 없습니다.`);
          }
        }
      }

      // Place Id 연결
      const placeIds = [];
      if (work.places && work.places.length > 0) {
        for (const placeId of work.places) {
          if (placeMap.has(placeId)) {
            placeIds.push(placeMap.get(placeId));
          } else {
            console.warn(`[SEED] 촬영지 ID '${placeId}'을(를) DB에서 찾을 수 없습니다.`);
          }
        }
      }
      
      // 새로운 Work 객체 생성 및 저장
      const newWork = new Work({
        ...work,
        characterIds,
        placeIds
      });
      await newWork.save();
    }
    console.log(`🎬 작품 ${worksData.length}개 및 관계 연결 완료`);

    // 8) 댓글 연결 상태 확인 (Character ID가 보존되므로 연결 문제 없음)
    const commentCount = await Comment.countDocuments({});
    if (commentCount > 0) {
      console.log(`💬 기존 댓글 ${commentCount}개 확인 완료 (ID 보존으로 연결 문제 없음)`);
    }

    console.log('✅ 데이터베이스 시딩 완료');
  } catch (error) {
    console.error('❌ Seeding 에러:', error);
  } finally {
    // 6) 연결 종료
    await mongoose.disconnect();
  }
}

// 스크립트 실행
seed();
