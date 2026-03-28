// migrate-comments.js
// 기존 댓글 데이터에 target 필드를 추가하는 마이그레이션 스크립트

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// .env 파일 불러오기
dotenv.config();

// Comment 모델 import
import Comment from './models/Comment.js';

async function migrateComments() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('🔗 MongoDB 연결 성공');

    // 1. 기존 댓글 개수 확인
    const totalComments = await Comment.countDocuments();
    console.log(`📊 총 댓글 개수: ${totalComments}개`);

    // 2. placeId가 있는 댓글에 target: 'places' 추가
    const placeComments = await Comment.updateMany(
      { placeId: { $exists: true, $ne: null } },
      { $set: { target: 'places' } }
    );
    console.log(`📍 장소 댓글 ${placeComments.modifiedCount}개 업데이트 완료`);

    // 3. characterId가 있는 댓글에 target: 'characters' 추가
    const characterComments = await Comment.updateMany(
      { characterId: { $exists: true, $ne: null } },
      { $set: { target: 'characters' } }
    );
    console.log(`👤 인물 댓글 ${characterComments.modifiedCount}개 업데이트 완료`);

    // 4. workId가 있는 댓글에 target: 'works' 추가
    const workComments = await Comment.updateMany(
      { workId: { $exists: true, $ne: null } },
      { $set: { target: 'works' } }
    );
    console.log(`🎬 작품 댓글 ${workComments.modifiedCount}개 업데이트 완료`);

    // 5. target 필드가 없는 댓글 확인
    const commentsWithoutTarget = await Comment.countDocuments({ target: { $exists: false } });
    console.log(`⚠️ target 필드가 없는 댓글: ${commentsWithoutTarget}개`);

    // 6. 최종 결과 확인
    const finalCount = await Comment.countDocuments();
    console.log(`✅ 마이그레이션 완료! 총 댓글: ${finalCount}개`);

    // 7. target별 댓글 개수 확인
    const targetStats = await Comment.aggregate([
      { $group: { _id: '$target', count: { $sum: 1 } } }
    ]);
    console.log('📈 target별 댓글 개수:');
    targetStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}개`);
    });

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  } finally {
    // 연결 종료
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
migrateComments();
