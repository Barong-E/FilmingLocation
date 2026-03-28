// routes/userRoutes.js
import express from 'express';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import sharp from 'sharp';

// 인증 미들웨어
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  res.status(401).json({ message: '로그인이 필요합니다.' });
}

const router = express.Router();

// (1) 내 정보 조회 (GET /api/user/me)
router.get('/user/me', ensureAuth, (req, res) => {
  // DB에서 필요한 모든 필드 뽑아오기!
  res.json({
    id: req.user._id,
    googleId: req.user.googleId,
    email: req.user.email,
    nickname: req.user.nickname,
    displayName: req.user.displayName,
    familyName: req.user.familyName,
    givenName: req.user.givenName,
    profileImageUrl: req.user.profileImage,   // ← JS코드와 이름 맞추기!
    createdAt: req.user.createdAt,
    // 앞으로 다른 필드 추가시에도 JS, DB, API 모두 이름 통일 추천!
  });
});

// (2) 닉네임 변경 (PATCH /api/user/me)
router.patch('/user/me', ensureAuth, async (req, res) => {
  const { nickname } = req.body;
  if (!nickname || nickname.length < 2 || nickname.length > 16) {
    return res.status(400).json({ message: '닉네임은 2~16자여야 합니다.' });
  }

  const exists = await User.findOne({ nickname });
  if (exists && !exists._id.equals(req.user._id)) {
    return res.status(409).json({ message: '이미 사용 중인 닉네임입니다.' });
  }

  req.user.nickname = nickname;
  await req.user.save();
  res.json({ nickname });
});

// 1. multer 저장 위치/파일명 세팅
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/profiles'); // 저장 폴더 (미리 만들어둘 것!)
  },
  filename: function (req, file, cb) {
    // 사용자별 고유 파일명 (예: userId.jpg)
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}${ext}`);
  }
});
const upload = multer({ storage });

// 2. 프로필 이미지 업로드 API
router.patch('/user/me/profile-image', ensureAuth, upload.single('profileImage'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  // 저장 경로 (이미 multer가 저장한 파일을 그대로 사용)
  // req.file.path가 바로 저장된 파일 경로!
  // URL은 public 기준 상대경로로 맞추기
  const url = `/images/profiles/${req.file.filename}`;

  req.user.profileImage = url;
  await req.user.save();

  res.json({ profileImageUrl: url });
});


export default router;
