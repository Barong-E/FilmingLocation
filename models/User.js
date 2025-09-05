import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  googleId:      { type: String, unique: true, required: true },
  email:         { type: String, unique: true, required: true },
  displayName:   { type: String },
  nickname:      { type: String },
  familyName:    { type: String }, // ★ 성
  givenName:     { type: String }, // ★ 이름
  profileImage:  { type: String },
  isActive:      { type: Boolean, default: true },
  createdAt:     { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
