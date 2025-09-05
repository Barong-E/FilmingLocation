import Admin from '../models/Admin.js';
import AdminLog from '../models/AdminLog.js';
import otpService from '../services/otpService.js';

// 관리자 인증 미들웨어
export const requireAdminAuth = async (req, res, next) => {
  try {
    // 세션에서 관리자 정보 확인
    console.log(`[requireAdminAuth] checking session - sessionID: ${req.sessionID}, adminId: ${req.session?.adminId}, cookies: ${Object.keys(req.cookies || {}).join(',')}`);
    
    if (!req.session.adminId) {
      console.log('[requireAdminAuth] FAILED - no adminId in session');
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '관리자 로그인이 필요합니다.',
          details: '세션이 만료되었거나 로그인이 필요합니다.'
        }
      });
    }
    
    // 관리자 정보 조회
    const admin = await Admin.findById(req.session.adminId);
    if (!admin || !admin.isActive) {
      console.log('[requireAdminAuth] FAILED - admin not found or inactive');
      req.session.destroy();
      return res.status(401).json({
        error: {
          code: 'INVALID_ADMIN',
          message: '유효하지 않은 관리자 계정입니다.',
          details: '계정이 비활성화되었거나 존재하지 않습니다.'
        }
      });
    }
    
    // 세션 타임아웃 확인 (30분)
    const sessionTimeout = 30 * 60 * 1000; // 30분
    if (req.session.lastActivity && 
        Date.now() - req.session.lastActivity > sessionTimeout) {
      req.session.destroy();
      return res.status(401).json({
        error: {
          code: 'SESSION_TIMEOUT',
          message: '세션이 만료되었습니다.',
          details: '보안을 위해 30분 후 자동 로그아웃됩니다.'
        }
      });
    }
    
    // 세션 활동 시간 업데이트
    req.session.lastActivity = Date.now();
    // 저장 보장 필요 없음: rolling=true 로 쿠키 갱신됨
    
    // 관리자 정보를 요청 객체에 추가
    req.admin = admin;
    
    console.log('[requireAdminAuth] SUCCESS - admin authenticated');
    next();
  } catch (error) {
    console.error('관리자 인증 오류:', error);
    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: '인증 처리 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
};

// 권한 검증 미들웨어
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: '관리자 인증이 필요합니다.'
        }
      });
    }
    
    // 슈퍼 관리자는 모든 권한 가짐
    if (req.admin.role === 'super_admin') {
      return next();
    }
    
    // 특정 권한 확인
    if (!req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        error: {
          code: 'PERMISSION_DENIED',
          message: '권한이 부족합니다.',
          details: `${permission} 권한이 필요합니다.`
        }
      });
    }
    
    next();
  };
};

// OTP 검증 미들웨어
export const requireOTP = async (req, res, next) => {
  try {
    // 본문 또는 헤더로 OTP 전달 허용
    const otpToken = req.body?.otpToken || req.get('X-OTP-Token');
    
    if (!otpToken) {
      return res.status(400).json({
        error: {
          code: 'OTP_REQUIRED',
          message: 'OTP 토큰이 필요합니다.',
          details: 'Google Authenticator에서 생성된 6자리 코드를 입력하세요.'
        }
      });
    }
    
    // OTP 검증
    const isValid = otpService.verifyTOTP(req.admin.otpSecret, otpToken);
    if (!isValid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_OTP',
          message: '잘못된 OTP 토큰입니다.',
          details: '올바른 6자리 코드를 입력하세요.'
        }
      });
    }
    
    next();
  } catch (error) {
    console.error('OTP 검증 오류:', error);
    return res.status(500).json({
      error: {
        code: 'OTP_ERROR',
        message: 'OTP 검증 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
};

// 활동 로그 미들웨어
export const logAdminActivity = (action, targetType = null) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // 응답 후 로그 기록
      setTimeout(async () => {
        try {
          const logData = {
            adminId: req.admin._id,
            adminUsername: req.admin.username,
            action: action,
            targetType: targetType,
            targetId: req.params.id || req.body.id,
            description: `${action} ${targetType || 'action'} by ${req.admin.username}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            status: res.statusCode < 400 ? 'success' : 'error'
          };
          
          if (res.statusCode >= 400) {
            logData.errorMessage = data;
          }
          
          await AdminLog.createLog(logData);
        } catch (error) {
          console.error('활동 로그 기록 실패:', error);
        }
      }, 0);
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// 관리자 로그인 처리
export const adminLogin = async (req, res) => {
  try {
    const { username, password, otpToken } = req.body;
    
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
    
    // OTP 검증 (활성화된 경우)
    if (admin.otpEnabled && otpToken) {
      try {
        console.log('OTP 검증 시도:', { secret: admin.otpSecret.substring(0, 10) + '...', token: otpToken });
        const isOTPValid = otpService.verifyTOTP(admin.otpSecret, otpToken);
        console.log('OTP 검증 결과:', isOTPValid);
        if (!isOTPValid) {
          await admin.incLoginAttempts();
          return res.status(401).json({
            error: {
              code: 'INVALID_OTP',
              message: '잘못된 OTP 토큰입니다.'
            }
          });
        }
      } catch (otpError) {
        console.error('OTP 검증 오류:', otpError);
        return res.status(500).json({
          error: {
            code: 'OTP_VERIFICATION_ERROR',
            message: 'OTP 검증 중 오류가 발생했습니다.',
            details: otpError.message
          }
        });
      }
    } else if (admin.otpEnabled && !otpToken) {
      return res.status(400).json({
        error: {
          code: 'OTP_REQUIRED',
          message: 'OTP 토큰이 필요합니다.'
        }
      });
    }
    
    // 로그인 성공 처리
    await admin.resetLoginAttempts();
    
    // 세션 설정
    req.session.adminId = admin._id;
    req.session.lastActivity = Date.now();
    
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
    console.error('관리자 로그인 오류:', error);
    console.error('오류 스택:', error.stack);
    res.status(500).json({
      error: {
        code: 'LOGIN_ERROR',
        message: '로그인 처리 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
};

// 관리자 로그아웃 처리
export const adminLogout = async (req, res) => {
  try {
    if (req.admin) {
      // 로그아웃 로그 기록
      await AdminLog.createLog({
        adminId: req.admin._id,
        adminUsername: req.admin.username,
        action: 'logout',
        description: `관리자 로그아웃: ${req.admin.username}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'success'
      });
    }
    
    // 세션 삭제
    req.session.destroy();
    
    res.json({
      success: true,
      message: '로그아웃 성공'
    });
    
  } catch (error) {
    console.error('관리자 로그아웃 오류:', error);
    res.status(500).json({
      error: {
        code: 'LOGOUT_ERROR',
        message: '로그아웃 처리 중 오류가 발생했습니다.',
        details: error.message
      }
    });
  }
};
