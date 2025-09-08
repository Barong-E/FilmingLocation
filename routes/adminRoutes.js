import express from 'express';
import Admin from '../models/Admin.js';
import AdminLog from '../models/AdminLog.js';
import User from '../models/User.js';
import Place from '../models/Place.js';
import Work from '../models/Work.js';
import Character from '../models/Character.js';
import Comment from '../models/Comment.js';
import otpService from '../services/otpService.js';
import {
  requireAdminAuth,
  requirePermission,
  requireOTP,
  logAdminActivity,
  adminLogin,
  adminLogout
} from '../middleware/adminAuth.js';

const router = express.Router();

// 라우터 진입 로그 (디버깅)
router.use((req, res, next) => {
  try {
    console.log(`[adminRoutes] ${req.method} ${req.path}`);
  } catch (e) {}
  next();
});

// 간단한 헬스체크 (디버깅용)
router.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ─── 인증 관련 라우트 ──────────────────────────────────────────────────

// 관리자 로그인 (1단계: ID/PW 검증)
router.post('/login-step1', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 필수 필드 확인
    if (!username || !password) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: '사용자명과 비밀번호를 입력하세요.'
        }
      });
    }
    
    // 관리자 조회
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '잘못된 로그인 정보입니다.'
        }
      });
    }
    
    // 계정 잠금 확인
    if (admin.isLocked()) {
      return res.status(423).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: '계정이 잠겨있습니다.',
          details: '5회 로그인 실패로 30분간 잠겨있습니다.'
        }
      });
    }
    
    // 비밀번호 검증
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '잘못된 로그인 정보입니다.'
        }
      });
    }
    
    // 1단계 성공 - OTP 필요 여부 확인
    if (admin.otpEnabled) {
      // OTP가 활성화된 경우 - 2단계로 진행
      res.json({
        success: true,
        message: '1단계 인증 성공. OTP를 입력하세요.',
        admin: {
          id: admin._id,
          username: admin.username,
          displayName: admin.displayName,
          role: admin.role,
          permissions: admin.permissions
        }
      });
    } else {
      // OTP가 비활성화된 경우 - 바로 로그인 완료
      await admin.resetLoginAttempts();
      req.session.adminId = admin._id;
      req.session.lastActivity = Date.now();
      console.log('[adminRoutes] step1 session id:', req.sessionID);
      // 세션 저장을 보장
      await new Promise((resolve, reject) => {
        req.session.save(err => err ? reject(err) : resolve());
      });

      res.json({
        success: true,
        message: '로그인 성공',
        admin: {
          id: admin._id,
          username: admin.username,
          displayName: admin.displayName,
          role: admin.role,
          permissions: admin.permissions
        }
      });
    }
    
  } catch (error) {
    console.error('1단계 로그인 오류:', error);
    res.status(500).json({
      error: {
        code: 'LOGIN_ERROR',
        message: '로그인 처리 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// 관리자 로그인 (2단계: OTP 검증)
router.post('/login-step2', async (req, res) => {
  try {
    const { adminId, otpToken } = req.body;
    
    if (!adminId || !otpToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: '관리자 정보와 OTP 토큰이 필요합니다.'
        }
      });
    }
    
    // 관리자 조회
    const admin = await Admin.findById(adminId);
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        error: {
          code: 'INVALID_ADMIN',
          message: '유효하지 않은 관리자 계정입니다.'
        }
      });
    }
    
    // OTP 검증
    const isOTPValid = otpService.verifyTOTP(admin.otpSecret, otpToken);
    if (!isOTPValid) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        error: {
          code: 'INVALID_OTP',
          message: '잘못된 OTP 토큰입니다.'
        }
      });
    }
    
    // 로그인 성공 처리
    await admin.resetLoginAttempts();
    
    // 세션 설정
    req.session.adminId = admin._id;
    req.session.lastActivity = Date.now();
    
    console.log(`[adminRoutes] step2 BEFORE save - session id: ${req.sessionID}, adminId: ${req.session.adminId}`);
    
    // 세션 저장을 보장
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error(`[adminRoutes] step2 session save ERROR:`, err);
          return reject(err);
        }
        console.log(`[adminRoutes] step2 AFTER save - session saved successfully`);
        resolve();
      });
    });
    
    // 로그인 로그 기록
    await AdminLog.createLog({
      adminId: admin._id,
      adminUsername: admin.username,
      action: 'login',
      description: `관리자 로그인: ${admin.username}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      status: 'success'
    });
    
    res.json({
      success: true,
      message: '로그인 성공',
      admin: {
        id: admin._id,
        username: admin.username,
        displayName: admin.displayName,
        role: admin.role,
        permissions: admin.permissions
      }
    });
    
  } catch (error) {
    console.error('2단계 로그인 오류:', error);
    res.status(500).json({
      error: {
        code: 'LOGIN_ERROR',
        message: '로그인 처리 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// 관리자 로그인 (기존 방식 - 호환성 유지)
router.post('/login', adminLogin);

// 관리자 로그아웃
router.post('/logout', requireAdminAuth, adminLogout);

// 현재 관리자 정보 조회
router.get('/me', requireAdminAuth, (req, res) => {
  console.log(`[adminRoutes] GET /me - session id: ${req.sessionID}, adminId: ${req.session?.adminId}, admin found: ${!!req.admin}`);
  res.json({
    success: true,
    admin: {
      id: req.admin._id,
      username: req.admin.username,
      displayName: req.admin.displayName,
      email: req.admin.email,
      role: req.admin.role,
      permissions: req.admin.permissions,
      lastLogin: req.admin.lastLogin
    }
  });
});

// OTP 설정
router.post('/setup-otp', requireAdminAuth, async (req, res) => {
  try {
    const secret = otpService.generateSecret();
    const qrUrl = otpService.generateQRUrl(secret, req.admin.username);
    
    // 임시로 시크릿 저장 (실제로는 확인 후 저장)
    req.session.tempOtpSecret = secret;
    
    res.json({
      success: true,
      secret: secret,
      qrUrl: qrUrl,
      message: 'QR 코드를 스캔하여 OTP를 설정하세요.'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'OTP_SETUP_ERROR',
        message: 'OTP 설정 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// OTP 활성화 확인
router.post('/verify-otp-setup', requireAdminAuth, async (req, res) => {
  try {
    const { otpToken } = req.body;
    const tempSecret = req.session.tempOtpSecret;
    
    if (!tempSecret) {
      return res.status(400).json({
        error: {
          code: 'NO_TEMP_SECRET',
          message: 'OTP 설정이 진행되지 않았습니다.'
        }
      });
    }
    
    const isValid = otpService.verifyTOTP(tempSecret, otpToken);
    if (!isValid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OTP',
          message: '잘못된 OTP 토큰입니다.'
        }
      });
    }
    
    // OTP 활성화
    req.admin.otpSecret = tempSecret;
    req.admin.otpEnabled = true;
    await req.admin.save();
    
    delete req.session.tempOtpSecret;
    
    res.json({
      success: true,
      message: 'OTP가 성공적으로 활성화되었습니다.'
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'OTP_VERIFY_ERROR',
        message: 'OTP 확인 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// ─── 대시보드 라우트 ──────────────────────────────────────────────────

// 대시보드 통계
router.get('/dashboard/stats', requireAdminAuth, async (req, res) => {
  try {
    console.log('=== 대시보드 통계 API 호출됨 ===');
    
    // 기본 통계
    const userCount = await User.countDocuments();
    const placeCount = await Place.countDocuments();
    const workCount = await Work.countDocuments();
    const characterCount = await Character.countDocuments();
    const commentCount = await Comment.countDocuments();
    
    console.log('통계 데이터:', { userCount, placeCount, workCount, characterCount, commentCount });
    
    // 최근 활동
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('displayName email createdAt');
    
    const recentComments = await Comment.find()
      .populate('userId', 'displayName')
      .populate('placeId', 'real_name fictional_name')
      .populate('workId', 'title')
      .populate('characterId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // 관리자 활동 로그
    const recentLogs = await AdminLog.find()
      .populate('adminId', 'username displayName')
      .sort({ timestamp: -1 })
      .limit(10);
    
    res.json({
      success: true,
      stats: {
        users: userCount,
        places: placeCount,
        works: workCount,
        characters: characterCount,
        comments: commentCount
      },
      recentActivity: {
        users: recentUsers,
        comments: recentComments,
        adminLogs: recentLogs
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'DASHBOARD_ERROR',
        message: '대시보드 데이터 조회 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// 대시보드 트렌드 (최근 N일 일별 집계)
router.get('/dashboard/trends', requireAdminAuth, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(parseInt(req.query.days || '7'), 90));
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));

    const toKey = (d) => {
      const y = d.getFullYear();
      const m = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const initSeries = () => {
      const map = {};
      for (let i = 0; i < days; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        map[toKey(d)] = 0;
      }
      return map;
    };

    const userSeries = initSeries();
    const commentSeries = initSeries();

    const users = await User.find({ createdAt: { $gte: since } }).select('createdAt');
    users.forEach(u => { const k = toKey(new Date(u.createdAt)); if (k in userSeries) userSeries[k]++; });

    const comments = await Comment.find({ createdAt: { $gte: since } }).select('createdAt');
    comments.forEach(c => { const k = toKey(new Date(c.createdAt)); if (k in commentSeries) commentSeries[k]++; });

    const labels = Object.keys(userSeries);
    res.json({ success: true, labels, series: { users: labels.map(k => userSeries[k]), comments: labels.map(k => commentSeries[k]) } });
  } catch (error) {
    res.status(500).json({ error: { code: 'TRENDS_ERROR', message: '트렌드 조회 실패', details: error.message } });
  }
});

// 대시보드 실시간 SSE (10초마다 통계 푸시)
router.get('/dashboard/stream', requireAdminAuth, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const sendStats = async () => {
    try {
      const payload = {
        users: await User.countDocuments(),
        places: await Place.countDocuments(),
        works: await Work.countDocuments(),
        characters: await Character.countDocuments(),
        comments: await Comment.countDocuments()
      };
      res.write(`event: stats\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: e.message })}\n\n`);
    }
  };

  const interval = setInterval(sendStats, 10000);
  sendStats();
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 15000);

  req.on('close', () => {
    clearInterval(interval);
    clearInterval(keepAlive);
    res.end();
  });
});

// ─── 사용자 관리 라우트 ──────────────────────────────────────────────────

// 사용자 목록 조회
router.get('/users', requireAdminAuth, requirePermission('users'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { nickname: { $regex: search, $options: 'i' } }
      ];
    }
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USERS_FETCH_ERROR',
        message: '사용자 목록 조회 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// 사용자 상세 조회
router.get('/users/:id', requireAdminAuth, requirePermission('users'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: '사용자를 찾을 수 없습니다.'
        }
      });
    }
    
    // 사용자 댓글 조회
    const comments = await Comment.find({ userId: user._id })
      .populate('placeId', 'real_name fictional_name')
      .populate('workId', 'title')
      .populate('characterId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      user,
      comments
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'USER_FETCH_ERROR',
        message: '사용자 정보 조회 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// 사용자 활성화/비활성화
router.patch('/users/:id/status', 
  requireAdminAuth, 
  requirePermission('users'),
  logAdminActivity('user_status_change', 'user'),
  async (req, res) => {
    try {
      const { isActive } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { isActive },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: '사용자를 찾을 수 없습니다.'
          }
        });
      }
      
      res.json({
        success: true,
        message: `사용자가 ${isActive ? '활성화' : '비활성화'}되었습니다.`,
        user
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'USER_STATUS_ERROR',
          message: '사용자 상태 변경 중 오류가 발생했습니다.',
          details: error.message
        }
      });
    }
  }
);

// ─── 데이터 관리 라우트 ──────────────────────────────────────────────────

// 장소 관리
router.get('/places', requireAdminAuth, requirePermission('places'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (search) {
      query.$or = [
        { real_name: { $regex: search, $options: 'i' } },
        { fictional_name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const places = await Place.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Place.countDocuments(query);
    
    res.json({
      success: true,
      places,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'PLACES_FETCH_ERROR',
        message: '장소 목록 조회 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// 장소 생성
router.post('/places', requireAdminAuth, requirePermission('places'), logAdminActivity('create', 'place'), async (req, res) => {
  try {
    const doc = await Place.create(req.body);
    res.status(201).json({ success: true, place: doc });
  } catch (error) {
    res.status(400).json({ error: { code: 'PLACE_CREATE_ERROR', message: '장소 생성 실패', details: error.message } });
  }
});

// 장소 상세
router.get('/places/:id', requireAdminAuth, requirePermission('places'), async (req, res) => {
  try {
    const place = await Place.findById(req.params.id);
    if (!place) return res.status(404).json({ error: { code: 'PLACE_NOT_FOUND', message: '장소 없음' } });
    res.json({ success: true, place });
  } catch (error) {
    res.status(500).json({ error: { code: 'PLACE_FETCH_ERROR', message: '장소 조회 실패', details: error.message } });
  }
});

// 장소 수정
router.put('/places/:id', requireAdminAuth, requirePermission('places'), logAdminActivity('update', 'place'), async (req, res) => {
  try {
    const updated = await Place.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: { code: 'PLACE_NOT_FOUND', message: '장소 없음' } });
    res.json({ success: true, place: updated });
  } catch (error) {
    res.status(400).json({ error: { code: 'PLACE_UPDATE_ERROR', message: '장소 수정 실패', details: error.message } });
  }
});

// 장소 삭제
router.delete('/places/:id', requireAdminAuth, requirePermission('places'), logAdminActivity('delete', 'place'), async (req, res) => {
  try {
    const deleted = await Place.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: { code: 'PLACE_NOT_FOUND', message: '장소 없음' } });
    res.json({ success: true, message: '삭제 완료' });
  } catch (error) {
    res.status(500).json({ error: { code: 'PLACE_DELETE_ERROR', message: '장소 삭제 실패', details: error.message } });
  }
});

// 작품 관리
router.get('/works', requireAdminAuth, requirePermission('works'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const works = await Work.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Work.countDocuments(query);
    
    res.json({
      success: true,
      works,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'WORKS_FETCH_ERROR',
        message: '작품 목록 조회 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// 작품 요약 리스트(제목/타입만) - 인물 추가 모달에서 사용
router.get('/works/summary', requireAdminAuth, async (req, res) => {
  try {
    const works = await Work.find({}, 'title type').sort({ title: 1 }).limit(1000);
    res.json({ success: true, works });
  } catch (error) {
    res.status(500).json({ error: { code: 'WORKS_SUMMARY_ERROR', message: '작품 요약 불러오기 실패', details: error.message } });
  }
});

router.post('/works', requireAdminAuth, requirePermission('works'), logAdminActivity('create', 'work'), async (req, res) => {
  try {
    const doc = await Work.create(req.body);
    res.status(201).json({ success: true, work: doc });
  } catch (error) {
    res.status(400).json({ error: { code: 'WORK_CREATE_ERROR', message: '작품 생성 실패', details: error.message } });
  }
});

router.get('/works/:id', requireAdminAuth, requirePermission('works'), async (req, res) => {
  try {
    const work = await Work.findById(req.params.id)
      .populate('characterIds', 'name')
      .populate('placeIds', 'real_name fictional_name');
    if (!work) return res.status(404).json({ error: { code: 'WORK_NOT_FOUND', message: '작품 없음' } });
    res.json({ success: true, work });
  } catch (error) {
    res.status(500).json({ error: { code: 'WORK_FETCH_ERROR', message: '작품 조회 실패', details: error.message } });
  }
});

router.put('/works/:id', requireAdminAuth, requirePermission('works'), logAdminActivity('update', 'work'), async (req, res) => {
  try {
    const { characterNames, placeNames, ...updateData } = req.body;
    
    // 캐릭터 이름을 ID로 변환
    let characterIds = [];
    if (characterNames && characterNames.length > 0) {
      const characters = await Character.find({ name: { $in: characterNames } });
      characterIds = characters.map(c => c._id);
    }
    
    // 장소 이름을 ID로 변환
    let placeIds = [];
    if (placeNames && placeNames.length > 0) {
      const places = await Place.find({
        $or: [
          { real_name: { $in: placeNames } },
          { fictional_name: { $in: placeNames } }
        ]
      });
      placeIds = places.map(p => p._id);
    }
    
    // 업데이트 데이터에 변환된 ID 추가
    const finalUpdateData = {
      ...updateData,
      characterIds,
      placeIds
    };
    
    const updated = await Work.findByIdAndUpdate(req.params.id, finalUpdateData, { new: true });
    if (!updated) return res.status(404).json({ error: { code: 'WORK_NOT_FOUND', message: '작품 없음' } });
    res.json({ success: true, work: updated });
  } catch (error) {
    res.status(400).json({ error: { code: 'WORK_UPDATE_ERROR', message: '작품 수정 실패', details: error.message } });
  }
});

router.delete('/works/:id', requireAdminAuth, requirePermission('works'), logAdminActivity('delete', 'work'), async (req, res) => {
  try {
    const deleted = await Work.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: { code: 'WORK_NOT_FOUND', message: '작품 없음' } });
    res.json({ success: true, message: '삭제 완료' });
  } catch (error) {
    res.status(500).json({ error: { code: 'WORK_DELETE_ERROR', message: '작품 삭제 실패', details: error.message } });
  }
});

// 인물 관리
router.get('/characters', requireAdminAuth, requirePermission('characters'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const characters = await Character.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Character.countDocuments(query);
    
    res.json({
      success: true,
      characters,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'CHARACTERS_FETCH_ERROR',
        message: '인물 목록 조회 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

router.post('/characters', requireAdminAuth, requirePermission('characters'), logAdminActivity('create', 'character'), async (req, res) => {
  try {
    const { workIds, ...characterData } = req.body;
    
    // id 필드 자동 생성 (영문 고유값)
    if (!characterData.id) {
      // 이름을 기반으로 영문 ID 생성
      const nameToId = characterData.name
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]/g, '') // 특수문자 제거
        .replace(/[가-힣]/g, (char) => {
          // 한글을 영문으로 변환 (간단한 매핑)
          const hangulMap = {
            '가': 'ga', '나': 'na', '다': 'da', '라': 'ra', '마': 'ma', '바': 'ba', '사': 'sa', '아': 'a', '자': 'ja', '차': 'cha', '카': 'ka', '타': 'ta', '파': 'pa', '하': 'ha',
            '김': 'kim', '이': 'lee', '박': 'park', '최': 'choi', '정': 'jung', '강': 'kang', '조': 'jo', '윤': 'yoon', '장': 'jang', '임': 'lim', '한': 'han', '오': 'oh', '서': 'seo', '신': 'shin', '권': 'kwon', '황': 'hwang', '안': 'ahn', '송': 'song', '노': 'noh', '하': 'ha', '전': 'jeon', '고': 'ko', '문': 'moon', '양': 'yang', '손': 'son', '배': 'bae', '백': 'baek', '유': 'yoo', '남': 'nam', '심': 'shim', '허': 'heo', '변': 'byun', '공': 'gong', '소': 'so', '채': 'chae', '민': 'min', '지': 'ji', '엄': 'eom', '원': 'won', '천': 'cheon', '방': 'bang', '곽': 'kwak', '제': 'je', '홍': 'hong', '우': 'woo', '도': 'do', '석': 'seok', '인': 'in', '여': 'yeo', '동': 'dong', '구': 'gu', '라': 'ra', '나': 'na', '마': 'ma', '바': 'ba', '사': 'sa', '아': 'a', '자': 'ja', '차': 'cha', '카': 'ka', '타': 'ta', '파': 'pa', '하': 'ha'
          };
          return hangulMap[char] || char;
        });
      
      // 중복 방지를 위해 타임스탬프 추가
      characterData.id = `${nameToId}_${Date.now()}`;
    }
    
    console.log('생성할 인물 데이터:', characterData);
    
    // 인물 생성
    const character = await Character.create(characterData);
    
    // 선택된 작품들의 characterIds와 characters에 새 인물 정보 추가
    if (workIds && workIds.length > 0) {
      // 기본적으로 characterIds만 추가
      await Work.updateMany(
        { _id: { $in: workIds } },
        { $push: { characterIds: character._id } }
      );

      // 작품별 작중이름 매핑 처리
      const map = Array.isArray(req.body.workCharacterNames) ? req.body.workCharacterNames : [];
      const updates = map
        .filter(x => x && x.workId && x.characterName)
        .map(x => {
          // 극중이름이 실제이름과 같은 경우 중복 제거
          let formattedCharName;
          if (x.characterName === character.name) {
            formattedCharName = character.name; // 실제이름만
          } else {
            formattedCharName = `${character.name}(${x.characterName})`; // 실제이름(극중이름)
          }
          
          return Work.updateOne({ _id: x.workId }, { $push: { characters: formattedCharName } });
        });
      if (updates.length > 0) {
        await Promise.all(updates);
      }
    }
    
    res.status(201).json({ success: true, character });
  } catch (error) {
    console.error('인물 생성 오류:', error);
    res.status(400).json({ error: { code: 'CHAR_CREATE_ERROR', message: '인물 생성 실패', details: error.message } });
  }
});

router.get('/characters/:id', requireAdminAuth, requirePermission('characters'), async (req, res) => {
  try {
    console.log(`=== 인물 조회 시작: ID = ${req.params.id} ===`);
    
    const doc = await Character.findById(req.params.id);
    const character = doc ? doc.toObject() : null;
    if (!character) {
      console.log(`인물을 찾을 수 없음: ${req.params.id}`);
      return res.status(404).json({ error: { code: 'CHAR_NOT_FOUND', message: '인물 없음' } });
    }

    console.log(`인물 정보: ${character.name} (${character._id})`);

    // 인물 ObjectId로 정확히 characterIds에 포함된 작품만 조회
    console.log(`작품 검색 시작 - characterIds에서 ${character._id} 찾기`);
    const works = await Work.find({ characterIds: character._id })
      .select('_id title characters characterIds');

    console.log(`Character ${character.name} (${character.id || character._id}) found ${works.length} works`);

    if (works.length > 0) {
      console.log('찾은 작품들:');
      works.forEach(work => {
        console.log(`  - ${work.title} (${work._id})`);
        console.log(`    characterIds: [${work.characterIds.join(', ')}]`);
        console.log(`    characters: [${work.characters.join(', ')}]`);
      });
    } else {
      console.log('관련 작품을 찾지 못했습니다.');
      // 디버깅을 위해 모든 작품의 characterIds 확인
      const allWorks = await Work.find({}).select('_id title characterIds characters');
      console.log('=== 전체 작품의 characterIds 확인 ===');
      allWorks.forEach(work => {
        console.log(`작품: ${work.title}`);
        console.log(`  characterIds: [${work.characterIds.map(id => id.toString()).join(', ')}]`);
        console.log(`  현재 인물 ID와 일치?: ${work.characterIds.some(id => id.toString() === character._id.toString())}`);
      });
    }

    // workIds와 각 작품별 작중이름(같은 인덱스) 매핑
    character.workIds = works.map(work => work._id.toString());
    character.workCharacterNames = {};
    works.forEach(work => {
      let roleName = '';
      if (Array.isArray(work.characterIds)) {
        const idx = work.characterIds.findIndex(id => id && id.toString() === character._id.toString());
        if (idx > -1 && Array.isArray(work.characters)) {
          const raw = work.characters[idx] || '';
          // 형식: "배우명(작중이름)"이면 괄호 안만 추출, 괄호가 없으면 작중이름 없음으로 처리
          const m = typeof raw === 'string' ? raw.match(/^[^()]*\(([^)]+)\)\s*$/) : null;
          roleName = m ? m[1] : '';
        }
      }
      character.workCharacterNames[work._id.toString()] = roleName;
    });

    console.log(`최종 결과 - workIds: [${character.workIds.join(', ')}]`);
    console.log(`최종 결과 - workCharacterNames:`, character.workCharacterNames);
    console.log('=== 인물 조회 완료 ===');

    res.json({ success: true, character });
  } catch (error) {
    console.error('인물 조회 오류:', error);
    res.status(500).json({ error: { code: 'CHAR_FETCH_ERROR', message: '인물 조회 실패', details: error.message } });
  }
});

router.put('/characters/:id', requireAdminAuth, requirePermission('characters'), logAdminActivity('update', 'character'), async (req, res) => {
  try {
    const { workIds, workCharacterNames = {}, ...characterData } = req.body;
    
    // 인물 정보 업데이트
    const updated = await Character.findByIdAndUpdate(req.params.id, characterData, { new: true });
    if (!updated) return res.status(404).json({ error: { code: 'CHAR_NOT_FOUND', message: '인물 없음' } });
    
    // 관련 작품 업데이트 (workIds가 제공된 경우)
    if (workIds && Array.isArray(workIds)) {
      // 기존 작품들에서 이 인물만 제거 (characters 배열은 인덱스 기반으로 정확히 제거)
      const worksWithThisChar = await Work.find({ characterIds: updated._id });
      
      for (const work of worksWithThisChar) {
        const charIndex = work.characterIds.findIndex(id => id.toString() === updated._id.toString());
        if (charIndex !== -1) {
          // characterIds에서 제거
          work.characterIds.splice(charIndex, 1);
          // 동일한 인덱스의 characters에서도 제거
          if (work.characters && work.characters[charIndex]) {
            work.characters.splice(charIndex, 1);
          }
          await work.save();
        }
      }
      
      // 새로운 작품들에 이 인물 추가
      if (workIds.length > 0) {
        // 각 작품별로 characterIds, characters 갱신
        for (const workId of workIds) {
          const charName = workCharacterNames[workId] || updated.name; // 없으면 인물명 기본
          
          // 극중이름이 실제이름과 같은 경우 중복 제거
          let formattedCharName;
          if (charName === updated.name) {
            formattedCharName = updated.name; // 실제이름만
          } else {
            formattedCharName = `${updated.name}(${charName})`; // 실제이름(극중이름)
          }
          
          await Work.findByIdAndUpdate(
            workId,
            { 
              $addToSet: { characterIds: updated._id },
              $push: { characters: formattedCharName }
            },
            { new: true }
          );
        }
      }
    }
    
    res.json({ success: true, character: updated });
  } catch (error) {
    console.error('인물 수정 오류:', error);
    res.status(400).json({ error: { code: 'CHAR_UPDATE_ERROR', message: '인물 수정 실패', details: error.message } });
  }
});

router.delete('/characters/:id', requireAdminAuth, requirePermission('characters'), logAdminActivity('delete', 'character'), async (req, res) => {
  try {
    const deleted = await Character.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: { code: 'CHAR_NOT_FOUND', message: '인물 없음' } });
    res.json({ success: true, message: '삭제 완료' });
  } catch (error) {
    res.status(500).json({ error: { code: 'CHAR_DELETE_ERROR', message: '인물 삭제 실패', details: error.message } });
  }
});

// ─── 로그 관리 라우트 ──────────────────────────────────────────────────

// 관리자 활동 로그 조회
router.get('/logs', requireAdminAuth, requirePermission('logs'), async (req, res) => {
  try {
    const { page = 1, limit = 50, adminId, action, targetType, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;
    
    const filters = {};
    if (adminId) filters.adminId = adminId;
    if (action) filters.action = action;
    if (targetType) filters.targetType = targetType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    
    const logs = await AdminLog.getLogs(filters, parseInt(limit));
    const total = await AdminLog.countDocuments(filters);
    
    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'LOGS_FETCH_ERROR',
        message: '로그 조회 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
});

// ─── 백업 라우트 ──────────────────────────────────────────────────

// 데이터 백업 (간단한 JSON 형태)
router.get('/backup', 
  requireAdminAuth, 
  requirePermission('backup'),
  requireOTP,
  logAdminActivity('backup', 'system'),
  async (req, res) => {
    try {
      const backup = {
        timestamp: new Date(),
        admin: req.admin.username,
        data: {
          users: await User.find().select('-__v'),
          places: await Place.find().select('-__v'),
          works: await Work.find().select('-__v'),
          characters: await Character.find().select('-__v'),
          comments: await Comment.find().select('-__v')
        }
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="filo-backup-${Date.now()}.json"`);
      res.json(backup);
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'BACKUP_ERROR',
          message: '백업 생성 중 오류가 발생했습니다.',
          details: error.message
        }
      });
    }
  }
);

export default router;
