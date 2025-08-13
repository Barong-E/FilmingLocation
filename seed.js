// seed.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';

import Place     from './models/Place.js';
import Work      from './models/Work.js';
import Character from './models/Character.js';

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

    // 3) 기존 데이터 삭제 -> 안전한 방식으로 변경 (주석 처리)
    // await Place.deleteMany();
    // await Work.deleteMany();
    // await Character.deleteMany();

    // 4) JSON 파일 읽기
    const placesData     = JSON.parse(await fs.readFile('data/places.json', 'utf-8'));
    const worksData      = JSON.parse(await fs.readFile('data/works.json',  'utf-8'));
    let charactersData = JSON.parse(await fs.readFile('data/characters.json',  'utf-8').catch(()=> '[]'));
    if (Array.isArray(charactersData)) {
      charactersData = charactersData.map(ch => {
        if ((!ch.birthDate || !ch.birthPlace) && ch.birth) {
          const parts = ch.birth.split(',');
          const first = (parts[0] || '').trim();
          const place = (parts[1] || '').trim();
          const m = first.match(/(\d{4}-\d{2}-\d{2})/);
          if (!ch.birthDate && m) ch.birthDate = m[1];
          if (!ch.birthPlace && place) ch.birthPlace = place;
        }
        return ch;
      });
    }

    // 5) 데이터베이스에 안전하게 삽입/업데이트 (Upsert)
    for (const place of placesData) {
      await Place.updateOne({ id: place.id }, place, { upsert: true });
    }
    for (const work of worksData) {
      await Work.updateOne({ id: work.id }, work, { upsert: true });
    }
    if (Array.isArray(charactersData) && charactersData.length) {
      for (const character of charactersData) {
        await Character.updateOne({ id: character.id }, character, { upsert: true });
      }
    }
    
    console.log('✅ 데이터베이스에 입력 완료');
  } catch (error) {
    console.error('❌ Seeding 에러:', error);
  } finally {
    // 6) 연결 종료
    await mongoose.disconnect();
  }
}

// 스크립트 실행
seed();
