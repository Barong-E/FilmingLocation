// scripts/inspect-itaewon.js
// 목적: DB(MONGO_URI)에서 '이태원'이 포함된 작품의 characterIds를 기준으로 등장인물  목록(이름/ID/인덱스)을 출력

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Work from '../models/Work.js';
import Character from '../models/Character.js';

dotenv.config();

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('환경변수 MONGO_URI가 없습니다. .env를 확인하세요.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');

    // '이태원'이 제목에 포함된 작품 찾기
    const work = await Work.findOne({ title: { $regex: '이태원', $options: 'i' } }).select(
      '_id title characterIds characters'
    );

    if (!work) {
      console.log('작품을 찾지 못했습니다: 이태원*');
      return;
    }

    console.log(`\n작품: ${work.title} (${work._id})`);
    console.log(`characterIds 개수: ${work.characterIds?.length || 0}`);
    console.log(`characters 배열: ${Array.isArray(work.characters) ? JSON.stringify(work.characters) : '없음'}`);

    // characterIds 순서대로 Character 문서 조회
    const result = [];
    for (let i = 0; i < (work.characterIds?.length || 0); i++) {
      const id = work.characterIds[i];
      const charDoc = id ? await Character.findById(id).select('_id name') : null;
      const inWorkName = Array.isArray(work.characters) ? work.characters[i] : undefined;
      result.push({ index: i, id: id?.toString(), name: charDoc?.name || '(삭제됨/없음)', inWorkName: inWorkName || '' });
    }

    console.log('\n=== 등장인물(인덱스순) ===');
    result.forEach(r => {
      console.log(`${r.index + 1}. ${r.name} (${r.id || 'N/A'})  → 작중이름: ${r.inWorkName}`);
    });

  } catch (err) {
    console.error('오류:', err);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();


