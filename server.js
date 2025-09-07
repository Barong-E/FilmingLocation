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
import searchRoutes      from './routes/searchRoutes.js';
import adminRoutes       from './routes/adminRoutes.js';

// Redis 연결 관리
import redisManager from './config/redis.js';

// ─── 환경 변수 설정 & DB 연결 ─────────────────────────────────────────
dotenv.config();
await connectDB();

// ─── Redis 연결 초기화 ────────────────────────────────────────────────
(async () => {
  try {
    await redisManager.connect();
    console.log('🚀 FiLo 서버 Redis 연결 완료');
  } catch (error) {
    console.log('⚠️  Redis 연결 실패, 메모리 캐시로 동작합니다:', error.message);
  }
})();

// ─── __dirname 정의 (ESM) ──────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Express 앱 생성 ──────────────────────────────────────────────────
const app = express();

// ─── 1) 핵심 미들웨어 설정 ──────────────────────────────────────────
// CORS 설정
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5500',
    'http://localhost:5501',
    'http://localhost:5000',
  ],
  credentials: true,
}));

// JSON 파싱
app.use(express.json());

// 세션 설정
app.use(session({
  name: 'filo.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: false, // 프로덕션에서는 true로 변경
    maxAge: 1000 * 60 * 30, // 30분
    httpOnly: true,
  },
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());


// ─── 2) 정적 파일 서빙 ───────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));


// ─── 3) 라우터 설정 ──────────────────────────────────────────────────────
// partials 폴더 라우트 (GNB 등 공통 컴포넌트)
app.get('/partials/:file', (req, res) => {
  const fileName = req.params.file;
  res.sendFile(path.join(__dirname, 'public', 'partials', fileName));
});

// 로그인 브릿지 페이지
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// 마이페이지 (HTML)
app.get('/mypage', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mypage.html'));
});

// 📊 관리자 로그인 페이지 (세션 있으면 대시보드로)
app.get('/admin', (req, res) => {
  try {
    if (req.session && req.session.adminId) {
      return res.redirect('/admin/dashboard');
    }
  } catch (e) {}
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// 관리자 페이지 접근 가드
const ensureAdminPage = (req, res, next) => {
  console.log(`[ensureAdminPage] checking session for URL: ${req.originalUrl}`);
  console.log(`[ensureAdminPage] session ID: ${req.sessionID}`);
  console.log(`[ensureAdminPage] session.adminId: ${req.session.adminId}`);

  if (!req.session || !req.session.adminId) {
    console.log('[ensureAdminPage] FAILED - no adminId in session. Redirecting to /admin');
    return res.redirect('/admin');
  }
  console.log('[ensureAdminPage] SUCCESS - adminId found. Proceeding.');
  next();
};

// 📊 관리자 대시보드 (로그인 후 접근)
// SPA 버전의 대시보드 사용 (admin-dashboard.html)
app.get('/admin/dashboard', ensureAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// 📊 관리자 사용자 관리
app.get('/admin/users', ensureAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'users.html'));
});

// 📊 관리자 장소 관리
app.get('/admin/places', ensureAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'places.html'));
});

// 📊 관리자 작품 관리
app.get('/admin/works', ensureAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'works.html'));
});

// 📊 관리자 인물 관리
app.get('/admin/characters', ensureAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'characters.html'));
});

// 📊 관리자 로그 관리
app.get('/admin/logs', ensureAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'logs.html'));
});

// 📊 관리자 백업 관리
app.get('/admin/backup', ensureAdminPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'backup.html'));
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

// 검색 결과 페이지 (신규 구조)
app.get('/search', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q) {
    // 기본 탭은 장소로 리다이렉트
    return res.redirect(`/search/places?q=${encodeURIComponent(q)}`);
  }
  res.sendFile(path.join(__dirname, 'public', 'search-results.html'));
});

// 탭 전용 경로: /search/:type (places|works|characters)
app.get('/search/:type', (req, res) => {
  const { type } = req.params;
  if (!['places', 'works', 'characters'].includes(type)) {
    return res.redirect('/search');
  }
  res.sendFile(path.join(__dirname, 'public', 'search-results.html'));
});

// ─── 4) API 라우터 ────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/places', placeRoutes);
app.use('/api/works',  workRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api',        userRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

// 댓글 라우터 (API 라우터보다 아래에 위치)
app.use('/api/places/:placeId/comments', commentRoutes);
app.use('/api/works/:workId/comments',   commentRoutes);
app.use('/api/characters/:characterId/comments', commentRoutes);


// ─── 5) 기본 라우트 (다른 모든 라우트 뒤에 위치) ─────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'places.html'));
});


// ─── 6) 서버 시작 ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
