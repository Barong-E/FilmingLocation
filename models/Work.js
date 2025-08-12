// models/Work.js

import mongoose from 'mongoose';

// Work(작품) 스키마 정의
const WorkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },   // 고유 식별자
  title: { type: String, required: true },                // 작품 제목
  type: { type: String },                                 // 드라마/영화/예능 등
  releaseDate: { type: String },                          // 공개일
  description: { type: String },                          // 간단 소개
  characters: { type: [String], default: [] }             // 등장인물 배열
});

// Work 모델 생성 및 내보내기
export default mongoose.model('Work', WorkSchema);
