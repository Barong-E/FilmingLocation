// models/Work.js

import mongoose from 'mongoose';

// Work(작품) 스키마 정의
const WorkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },   // 고유 식별자
  title: { type: String, required: true },                // 작품 제목
  type: { type: String },                                 // 드라마/영화/예능 등
  releaseDate: { type: String },                          // 공개일
  description: { type: String },                          // 간단 소개
  image: { type: String },                                // 포스터 이미지 경로 (/images/works/{id}.png)
  characters: { type: [String], default: [] },             // 등장인물 배열 (화면 표시용)
  characterIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Character' }], // Character 모델 참조
  placeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place' }],       // Place 모델 참조
  createdAt: { type: Date, default: Date.now }
});

// 검색 성능 최적화를 위한 인덱스 추가
WorkSchema.index({ title: 1 });                          // 작품 제목 인덱스
WorkSchema.index({ characters: 1 });                     // 등장인물 배열 인덱스
WorkSchema.index({ type: 1 });                          // 작품 타입 인덱스
WorkSchema.index({ characterIds: 1 });                  // Character 참조 인덱스
WorkSchema.index({ placeIds: 1 });                      // Place 참조 인덱스
WorkSchema.index({ title: 'text', characters: 'text', description: 'text' }); // 텍스트 검색 인덱스

// Work 모델 생성 및 내보내기
export default mongoose.model('Work', WorkSchema);
