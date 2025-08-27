// models/Place.js
import mongoose from 'mongoose';

// Place 스키마 정의
const PlaceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },       // 고유 식별자
  real_name: { type: String },                               // 실제 장소명
  fictional_name: { type: String },                          // 드라마/영화 속 이름
  address: { type: String },                                 // 주소
  image: { type: String },                                   // 이미지 경로
  mapUrl: { type: String }                                   // 구글맵 링크
});

// 검색 성능 최적화를 위한 인덱스 추가
PlaceSchema.index({ real_name: 1 });                        // 실제 장소명 인덱스
PlaceSchema.index({ fictional_name: 1 });                   // 가명 인덱스
PlaceSchema.index({ address: 1 });                          // 주소 인덱스
PlaceSchema.index({ real_name: 'text', fictional_name: 'text', address: 'text' }); // 텍스트 검색 인덱스

// Place 모델 생성 및 내보내기
export default mongoose.model('Place', PlaceSchema);
