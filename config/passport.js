// config/passport.js

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  '/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
        // [추가] 구글에서 받은 프로필 정보 콘솔 출력
      // 개발/디버깅용 (운영 시에는 주석 처리!)
      // console.log('========== 구글에서 받은 profile 전체 ==========');
      // console.log(profile);
      // console.log('========== displayName ==========');
      // console.log(profile.displayName);
      // console.log('========== name ==========');
      // console.log(profile.name);
      // console.log('========== emails ==========');
      // console.log(profile.emails);
      // console.log('========== photos ==========');
      // console.log(profile.photos);

      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          // nickname 우선순위: _json.given_name → name.givenName → displayName → 이메일 앞부분
          let nickname =
            (profile._json && profile._json.given_name) ||
            (profile.name && profile.name.givenName) ||
            profile.displayName ||
            (profile.emails && profile.emails[0].value.split('@')[0]) ||
            '사용자';

          user = await User.create({
            googleId:    profile.id,
            email:       profile.emails[0].value,
            displayName: profile.displayName,
            nickname,    // nickname 필드 확실히 저장
            familyName:   profile.name?.familyName || profile._json?.family_name || '',
            givenName:    profile.name?.givenName  || profile._json?.given_name  || '',
            profileImage: (profile.photos && profile.photos[0]?.value)
                || profile._json?.picture
                || '',
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
