// server.js
import path              from 'path';
import { fileURLToPath } from 'url';

import express           from 'express';
import cors              from 'cors';
import session           from 'express-session';
import dotenv            from 'dotenv';
import passport          from './config/passport.js';

import { connectDB }     from './config/db.js';
import authRoutes        from './routes/authRoutes.js';
import placeRoutes       from './routes/placeRoutes.js';
import workRoutes        from './routes/workRoutes.js';
import characterRoutes   from './routes/characterRoutes.js';
import commentRoutes     from './routes/commentRoutes.js';
import userRoutes        from './routes/userRoutes.js';

// ─── 환경 변수 설정 & DB 연결 ─────────────────────────────────────────
dotenv.config();
await connectDB();

// ─── __dirname 정의 (ESM) ──────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Express 앱 생성 ──────────────────────────────────────────────────
const app = express();

// ─── 정적 파일 서빙 ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// 로그인 브릿지 페이지
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 마이페이지 (HTML)
app.get('/mypage', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mypage.html'));
});

// HTML 페이지 라우트 (확장자 없이)
app.get('/places', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'places.html'));
});

app.get('/works', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'works.html'));
});

app.get('/characters', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'characters.html'));
});

app.get('/place', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'place.html'));
});

app.get('/work', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'work.html'));
});

app.get('/character', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'character.html'));
});

app.get('/search-results', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'search-results.html'));
});

// ─── 2) CORS 설정 ─────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5500',
    'http://localhost:5501',
  ],
  credentials: true,
}));

// ─── 3) JSON 파싱 ───────────────────────────────────────────────────────
app.use(express.json());

// ─── 4) 세션 설정 ───────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7일
  },
}));

// ─── 5) Passport 초기화 ─────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ─── 6) 인증 라우터 ───────────────────────────────────────────────────
app.use('/auth', authRoutes);

// ─── 7) API 라우터 ────────────────────────────────────────────────────
app.use('/api/places', placeRoutes);
app.use('/api/works',  workRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api',        userRoutes); // ⭐ 이 부분이 중요!

// ─── 8) 댓글 라우터 ───────────────────────────────────────────────────
app.use('/api/places/:placeId/comments', commentRoutes);
app.use('/api/works/:workId/comments',   commentRoutes);
app.use('/api/characters/:characterId/comments', commentRoutes);

// ─── 9) 기본 라우트 (장소 리스트 페이지) ───────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'places.html'));
});

// ─── 10) 서버 시작 (모바일 접속 가능!) ────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
