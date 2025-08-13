import mongoose from 'mongoose';

const CharacterSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true }, // 영문 고유값
  name:         { type: String, required: true },               // 실제 인물 이름
  image:        { type: String },                               // 이미지 URL/경로
  job:          { type: String },                               // 직업(배우, 가수 등)
  birth:        { type: String },                               // 예: 1988-12-16 (만 35세), 서울특별시
  birthDate:    { type: String },                               // YYYY-MM-DD
  birthPlace:   { type: String },                               // 출생지
  awards:       { type: [String], default: [] },                // 수상 내역
  education:    { type: [String], default: [] },                // 학력 내역
  nationality:  { type: String },                               // 국적
  description:  { type: String },                               // 소개
  workIds:      { type: [String], default: [] },                // 연관 작품 id(선택)
  heightCm:     { type: Number },                               // 키(cm)
  weightKg:     { type: Number },                               // 몸무게(kg)
});

// 가상 필드: 만 나이
CharacterSchema.virtual('age').get(function() {
  const dateStr = this.birthDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return undefined;
  const [yy, mm, dd] = dateStr.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - yy;
  const hasHadBirthday = (today.getMonth() > mm - 1) || (today.getMonth() === mm - 1 && today.getDate() >= dd);
  if (!hasHadBirthday) age -= 1;
  return `만 ${age}세`;
});

CharacterSchema.set('toJSON', { virtuals: true });
CharacterSchema.set('toObject', { virtuals: true });

export default mongoose.model('Character', CharacterSchema);


