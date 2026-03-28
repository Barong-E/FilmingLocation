// config/db.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const MONGO_URI_ENV_KEY = 'MONGO_URI';
const DB_CONNECT_FAILURE_EXIT_CODE = 1;

function getMongoUriFromEnv() {
  return process.env[MONGO_URI_ENV_KEY];
}

/**
 * MongoDB 연결 함수
 * 환경변수 MONGO_URI를 사용하여 Atlas 클러스터에 연결
 */
export async function connectDB() {
  try {
    const mongoUri = getMongoUriFromEnv();
    if (!mongoUri) {
      throw new Error(`${MONGO_URI_ENV_KEY} 환경변수가 설정되지 않았습니다.`);
    }

    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 연결 성공');
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    process.exit(DB_CONNECT_FAILURE_EXIT_CODE);
  }
}
