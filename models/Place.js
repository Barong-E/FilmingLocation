// models/Place.js
import mongoose from 'mongoose';

// Place 스키마 정의
const PlaceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },       // 고유 식별자
  real_name: { type: String },                               // 실제 장소명
  fictional_name: { type: String },                          // 드라마/영화 속 이름
  address: { type: String },                                 // 주소
  image: { type: String },                                   // 이미지 경로
  workId: { type: String, required: true },                  // 연관된 작품 ID
  mapUrl: { type: String }                                   // 구글맵 링크
});

// Place 모델 생성 및 내보내기
export default mongoose.model('Place', PlaceSchema);
