import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Place from '../models/Place.js';
import Work from '../models/Work.js';
import Character from '../models/Character.js';
import Comment from '../models/Comment.js';

dotenv.config();

async function testDashboardStats() {
  try {
    console.log('🔌 데이터베이스 연결 중...');
    await connectDB();
    console.log('✅ 데이터베이스 연결 완료');

    console.log('\n📊 각 모델의 문서 개수 확인:');
    
    // 각 모델의 개수 확인
    const userCount = await User.countDocuments();
    console.log(`👥 사용자: ${userCount}개`);
    
    const placeCount = await Place.countDocuments();
    console.log(`📍 장소: ${placeCount}개`);
    
    const workCount = await Work.countDocuments();
    console.log(`🎬 작품: ${workCount}개`);
    
    const characterCount = await Character.countDocuments();
    console.log(`👤 인물: ${characterCount}개`);
    
    const commentCount = await Comment.countDocuments();
    console.log(`💬 댓글: ${commentCount}개`);

    console.log('\n📈 최근 활동 확인:');
    
    // 최근 사용자 확인
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select('displayName email createdAt');
    console.log(`👥 최근 사용자: ${recentUsers.length}개`);
    recentUsers.forEach(user => {
      console.log(`  - ${user.displayName} (${user.email}) - ${user.createdAt}`);
    });

    // 최근 댓글 확인
    const recentComments = await Comment.find()
      .populate('userId', 'displayName')
      .sort({ createdAt: -1 })
      .limit(3);
    console.log(`💬 최근 댓글: ${recentComments.length}개`);
    recentComments.forEach(comment => {
      console.log(`  - ${comment.userId?.displayName || 'Unknown'}: ${comment.content?.substring(0, 30)}...`);
    });

    console.log('\n✅ 모든 테스트 완료!');
    process.exit(0);

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('스택:', error.stack);
    process.exit(1);
  }
}

testDashboardStats();

