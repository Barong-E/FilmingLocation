import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';

import Character from '../models/Character.js';

dotenv.config();

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('🔗 MongoDB 연결 성공');

    const json = await fs.readFile(new URL('../data/characters.json', import.meta.url));
    const list = JSON.parse(json.toString());

    if (!Array.isArray(list)) {
      throw new Error('characters.json 형식 오류: 배열이 아닙니다');
    }

    let upserts = 0;
    for (const c of list) {
      if (!c?.id || !c?.name) {
        console.warn('⚠️ 누락된 필드로 건너뜀:', c);
        continue;
      }
      const _id = c.id; // 문자열 고정 ID
      const doc = {
        _id,
        name: c.name ?? '',
        image: c.image ?? '',
        job: c.job ?? '',
        birth: c.birth ?? '',
        birthDate: c.birthDate ?? '',
        birthPlace: c.birthPlace ?? '',
        education: Array.isArray(c.education) ? c.education : (c.education ? [c.education] : []),
        nationality: c.nationality ?? '',
        description: typeof c.description === 'string' ? c.description : '',
        heightCm: c.heightCm ?? null,
        weightKg: c.weightKg ?? null,
      };

      await Character.findOneAndUpdate({ _id }, doc, { upsert: true, setDefaultsOnInsert: true });
      upserts += 1;
    }

    console.log(`✅ 캐릭터 동기화 완료: ${upserts}건 upsert`);
  } catch (err) {
    console.error('❌ 동기화 실패:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

main();
