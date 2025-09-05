import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Character from '../models/Character.js';

dotenv.config();

async function testCharacter() {
  try {
    console.log('🔌 데이터베이스 연결 중...');
    await connectDB();
    console.log('✅ 데이터베이스 연결 완료');

    console.log('\n👤 Character 모델 테스트:');
    
    const characterCount = await Character.countDocuments();
    console.log(`👤 인물: ${characterCount}개`);
    
    const characters = await Character.find().limit(3);
    console.log(`📋 인물 목록 (최대 3개):`);
    characters.forEach(char => {
      console.log(`  - ${char.name} (${char.job || '직업 미상'})`);
    });

    console.log('\n✅ Character 테스트 완료!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Character 테스트 실패:', error.message);
    console.error('스택:', error.stack);
    process.exit(1);
  }
}

testCharacter();

