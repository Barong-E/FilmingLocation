// scripts/format-itaewon-characters.js
// 목적: '이태원' 작품의 Work.characters를 "배우명(작중이름)" 형식으로 정규화

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Work from '../models/Work.js';
import Character from '../models/Character.js';

dotenv.config();

async function main() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('환경변수 MONGO_URI가 없습니다.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');

    const work = await Work.findOne({ title: { $regex: '이태원', $options: 'i' } }).select(
      '_id title characterIds characters'
    );
    if (!work) {
      console.log('작품을 찾을 수 없습니다: 이태원*');
      return;
    }

    console.log(`작품: ${work.title} (${work._id})`);
    const ids = work.characterIds || [];
    const inWorkNames = Array.isArray(work.characters) ? work.characters : [];

    // 길이 맞추기 (부족하면 빈 문자열로 채움)
    while (inWorkNames.length < ids.length) inWorkNames.push('');

    const combined = [];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const charDoc = await Character.findById(id).select('name');
      const actorName = charDoc?.name || '이름없음';
      const roleName = (inWorkNames[i] || '').trim();
      const formatted = roleName ? `${actorName}(${roleName})` : actorName;
      combined.push(formatted);
    }

    work.characters = combined;
    await work.save();

    console.log('🎉 정규화 완료');
    console.log('characters:', JSON.stringify(work.characters));
  } catch (err) {
    console.error('오류:', err);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();


