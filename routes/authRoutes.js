// routes/authRoutes.js

import express from 'express';
import passport from 'passport';

const router = express.Router();

// 1) Google 로그인 시작
router.get(
  '/google',
  (req, res, next) => {
    // #region agent log
    const protocol = req.protocol || 'unknown';
    const host = req.get('host') || 'unknown';
    const xProto = req.get('x-forwarded-proto') || '';
    const xHost = req.get('x-forwarded-host') || '';
    const builtRedirectUri = `${protocol}://${host}/auth/google/callback`;
    const payload = { sessionId: '08a2a4', runId: 'oauth-redirect', hypothesisId: 'A,B,C', location: 'authRoutes.js:GET /google', message: 'redirect_uri sent to Google', data: { protocol, host, xForwardedProto: xProto, xForwardedHost: xHost, builtRedirectUri }, timestamp: Date.now() };
    fetch('http://127.0.0.1:7712/ingest/fb9409fa-19ed-4f8b-9eaf-7f24a343e882', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '08a2a4' }, body: JSON.stringify(payload) }).catch(() => {});
    console.log('[DEBUG-08a2a4] OAuth redirect_uri built:', builtRedirectUri, '| protocol=', protocol, 'host=', host, 'x-forwarded-proto=', xProto, 'x-forwarded-host=', xHost);
    // #endregion
    // redirect_uri를 state 옵션을 통해 전달
    const redirectUri = req.query.redirect_uri || '/';
    const authenticator = passport.authenticate('google', {
      scope: ['profile', 'email'],
      state: redirectUri, // state에 리다이렉트 주소 저장
    });
    authenticator(req, res, next);
  }
);

// 2) Google 로그인 콜백 (수정된 방식)
router.get(
  '/google/callback',
  (req, res, next) => {
    // state 값(로그인 전 페이지)을 미리 저장
    const redirectUri = req.query.state || '/';

    const authenticator = passport.authenticate(
      'google',
      {
        failureRedirect: '/login.html?loginError=true',
        failureMessage: true,
      },
      // 인증이 끝나면 이 콜백 함수가 실행됨
      (err, user, info) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.redirect('/login.html?loginError=true');
        }
        // passport가 req.logIn을 통해 세션에 사용자 정보를 저장
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            return next(loginErr);
          }
          // 세션에 저장이 완료된 후, 원래 있던 페이지로 리다이렉트
          return res.redirect(redirectUri);
        });
      }
    );

    authenticator(req, res, next);
  }
);

// 3) 로그아웃
router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);

    // 안전한 리다이렉트 URL 결정: 내부 경로만 허용
    const requested = req.query.redirect_uri;
    const isSafeInternalPath = typeof requested === 'string' && requested.startsWith('/');
    const redirectUrl = isSafeInternalPath ? requested : '/';

    // 세션 자체를 지우고
    req.session.destroy(() => {
      // 브라우저에 남은 세션 쿠키도 제거
      res.clearCookie('connect.sid');
      res.redirect(redirectUrl);     // 로그아웃 후 요청한 경로로 이동
    });
  });
});

// 4) 현재 로그인된 사용자 정보
router.get('/me', (req, res) => {
  if (!req.user) return res.json(null);
  res.json({
    id:          req.user.id,
    displayName: req.user.displayName,
    email:       req.user.email
  });
});


export default router;
