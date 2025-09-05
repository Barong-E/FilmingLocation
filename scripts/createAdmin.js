import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Admin from '../models/Admin.js';
import otpService from '../services/otpService.js';

// 환경 변수 로드
dotenv.config();

// 관리자 계정 생성 함수
async function createAdmin() {
  try {
    // DB 연결
    await connectDB();
    console.log('✅ 데이터베이스 연결 완료');
    
    // 관리자 정보 (실제 운영 시에는 환경변수나 안전한 방법으로 관리)
    const adminData = {
      username: 'admin',
      email: 'admin@filo.com',
      password: 'admin123!@#', // 실제 운영 시 강력한 비밀번호 사용
      displayName: 'FiLo 관리자',
      role: 'super_admin',
      permissions: ['users', 'places', 'works', 'characters', 'comments', 'logs', 'backup'],
      otpSecret: otpService.generateSecret(),
      otpEnabled: true
    };
    
    // 기존 관리자 확인
    const existingAdmin = await Admin.findOne({ username: adminData.username });
    if (existingAdmin) {
      console.log('⚠️  관리자 계정이 이미 존재합니다.');
      console.log(`사용자명: ${existingAdmin.username}`);
      console.log(`이메일: ${existingAdmin.email}`);
      console.log(`역할: ${existingAdmin.role}`);
      return;
    }
    
    // 새 관리자 생성
    const admin = new Admin(adminData);
    await admin.save();
    
    console.log('✅ 관리자 계정 생성 완료!');
    console.log('📋 계정 정보:');
    console.log(`  사용자명: ${admin.username}`);
    console.log(`  이메일: ${admin.email}`);
    console.log(`  표시명: ${admin.displayName}`);
    console.log(`  역할: ${admin.role}`);
    console.log(`  권한: ${admin.permissions.join(', ')}`);
    console.log(`  OTP 시크릿: ${admin.otpSecret}`);
    
    // QR 코드 URL 생성
    const qrUrl = otpService.generateQRUrl(admin.otpSecret, admin.username);
    console.log('\n📱 OTP 설정:');
    console.log(`  QR 코드 URL: ${qrUrl}`);
    console.log('  Google Authenticator 앱에서 QR 코드를 스캔하세요.');
    
    console.log('\n🔐 로그인 정보:');
    console.log(`  사용자명: ${admin.username}`);
    console.log(`  비밀번호: ${adminData.password}`);
    console.log('  ⚠️  실제 운영 시에는 반드시 비밀번호를 변경하세요!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 관리자 계정 생성 실패:', error.message);
    process.exit(1);
  }
}

// 스크립트 실행
createAdmin();
