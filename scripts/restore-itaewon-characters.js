// scripts/restore-itaewon-characters.js
// 목적: '이태원'이 포함된 작품의 Work.characters 배열을 전달된 순서대로 복구

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Work from '../models/Work.js';

dotenv.config();

const IN_WORK_NAMES = [
  '오수아',
  '조이서',
  '장근수',
  '조정민',
  '최승권',
  '박새로이',
  '장대희',
  '장근원',
  '김희훈',
  '오병헌',
  '김순계',
  '이호진',
  '마현이',
  '오혜원',
  '김토니'
];

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('환경변수 MONGO_URI가 없습니다. .env를 확인하세요.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');

    const work = await Work.findOne({ title: { $regex: '이태원', $options: 'i' } }).select(
      '_id title characterIds characters'
    );
    if (!work) {
      console.log('작품을 찾지 못했습니다: 이태원*');
      return;
    }

    console.log(`현재 characterIds: ${work.characterIds.length}개, characters: ${Array.isArray(work.characters) ? work.characters.length : 0}개`);
    if (work.characterIds.length !== IN_WORK_NAMES.length) {
      console.warn(`경고: 전달받은 작중이름(${IN_WORK_NAMES.length})과 characterIds(${work.characterIds.length}) 개수가 다릅니다. 전달받은 개수 기준으로 저장합니다.`);
    }

    work.characters = IN_WORK_NAMES.slice(0, work.characterIds.length);
    await work.save();

    console.log('\n🎉 저장 완료');
    console.log(`작품: ${work.title} (${work._id})`);
    console.log('characters:', JSON.stringify(work.characters));
  } catch (err) {
    console.error('오류:', err);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();


