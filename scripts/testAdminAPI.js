import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Place from '../models/Place.js';
import Work from '../models/Work.js';
import Character from '../models/Character.js';
import Comment from '../models/Comment.js';
import AdminLog from '../models/AdminLog.js';

dotenv.config();

async function testAdminAPI() {
  try {
    console.log('🔌 데이터베이스 연결 중...');
    await connectDB();
    console.log('✅ 데이터베이스 연결 완료');

    console.log('\n📊 대시보드 통계 API 로직 테스트:');
    
    // 기본 통계 (adminRoutes.js의 로직과 동일)
    console.log('1. 기본 통계 계산 중...');
    const userCount = await User.countDocuments();
    console.log(`   👥 사용자: ${userCount}개`);
    
    const placeCount = await Place.countDocuments();
    console.log(`   📍 장소: ${placeCount}개`);
    
    const workCount = await Work.countDocuments();
    console.log(`   🎬 작품: ${workCount}개`);
    
    const characterCount = await Character.countDocuments();
    console.log(`   👤 인물: ${characterCount}개`);
    
    const commentCount = await Comment.countDocuments();
    console.log(`   💬 댓글: ${commentCount}개`);

    console.log('\n2. 최근 활동 조회 중...');
    
    // 최근 사용자
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('displayName email createdAt');
    console.log(`   👥 최근 사용자: ${recentUsers.length}개`);
    
    // 최근 댓글 (populate 테스트)
    const recentComments = await Comment.find()
      .populate('userId', 'displayName')
      .populate('placeId', 'real_name fictional_name')
      .populate('workId', 'title')
      .populate('characterId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);
    console.log(`   💬 최근 댓글: ${recentComments.length}개`);
    
    // 관리자 활동 로그
    const recentLogs = await AdminLog.find()
      .populate('adminId', 'username displayName')
      .sort({ timestamp: -1 })
      .limit(10);
    console.log(`   📋 관리자 로그: ${recentLogs.length}개`);

    console.log('\n3. 응답 데이터 구성 테스트...');
    const responseData = {
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
    };
    
    console.log('✅ 응답 데이터 구성 완료');
    console.log('📊 통계 요약:', responseData.stats);

    console.log('\n✅ 모든 API 로직 테스트 완료!');
    process.exit(0);

  } catch (error) {
    console.error('❌ API 테스트 실패:', error.message);
    console.error('스택:', error.stack);
    process.exit(1);
  }
}

testAdminAPI();
