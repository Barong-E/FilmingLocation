// config/db.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();  // .env 파일 로드

/**
 * MongoDB 연결 함수
 * 환경변수 MONGO_URI를 사용하여 Atlas 클러스터에 연결
 */
export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB 연결 성공');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(1);  // 연결 실패 시 프로세스 종료
  }
}
