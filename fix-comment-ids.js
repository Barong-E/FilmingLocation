// fix-comment-ids.js
// 댓글의 ID를 현재 엔티티 _id와 매칭되도록 수정하는 스크립트

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// .env 파일 불러오기
dotenv.config();

// 모델들 import
import Place from './models/Place.js';
import Work from './models/Work.js';
import Character from './models/Character.js';
import Comment from './models/Comment.js';

async function fixCommentIds() {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('🔗 MongoDB 연결 성공');

    // 1. 장소 댓글 ID 수정
    console.log('\n📍 장소 댓글 ID 수정 중...');
    const placeComments = await Comment.find({ target: 'places' });
    
    for (const comment of placeComments) {
      // placeId가 있는 댓글 찾기
      if (comment.placeId) {
        // 이전 placeId로 Place 찾기
        const oldPlace = await Place.findById(comment.placeId);
        if (oldPlace) {
          // 새로운 _id로 업데이트
          await Comment.updateOne(
            { _id: comment._id },
            { placeId: oldPlace._id }
          );
          console.log(`   댓글 ${comment._id}: placeId 업데이트 완료`);
        }
      }
    }

    // 2. 인물 댓글 ID 수정
    console.log('\n👤 인물 댓글 ID 수정 중...');
    const characterComments = await Comment.find({ target: 'characters' });
    
    for (const comment of characterComments) {
      // characterId가 있는 댓글 찾기
      if (comment.characterId) {
        // 이전 characterId로 Character 찾기
        const oldCharacter = await Character.findById(comment.characterId);
        if (oldCharacter) {
          // 새로운 _id로 업데이트
          await Comment.updateOne(
            { _id: comment._id },
            { characterId: oldCharacter._id }
          );
          console.log(`   댓글 ${comment._id}: characterId 업데이트 완료`);
        }
      }
    }

    // 3. 작품 댓글 ID 수정
    console.log('\n🎬 작품 댓글 ID 수정 중...');
    const workComments = await Comment.find({ target: 'works' });
    
    for (const comment of workComments) {
      // workId가 있는 댓글 찾기
      if (comment.workId) {
        // 이전 workId로 Work 찾기
        const oldWork = await Work.findById(comment.workId);
        if (oldWork) {
          // 새로운 _id로 업데이트
          await Comment.updateOne(
            { _id: comment._id },
            { workId: oldWork._id }
          );
          console.log(`   댓글 ${comment._id}: workId 업데이트 완료`);
        }
      }
    }

    // 4. 최종 결과 확인
    console.log('\n✅ ID 수정 완료!');
    
    // 수정된 댓글 개수 확인
    const totalComments = await Comment.countDocuments();
    console.log(`📊 총 댓글 개수: ${totalComments}개`);

    // target별 댓글 개수 확인
    const targetStats = await Comment.aggregate([
      { $group: { _id: '$target', count: { $sum: 1 } } }
    ]);
    console.log('📈 target별 댓글 개수:');
    targetStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}개`);
    });

  } catch (error) {
    console.error('❌ ID 수정 실패:', error);
  } finally {
    // 연결 종료
    await mongoose.disconnect();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
fixCommentIds();
