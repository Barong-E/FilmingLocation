// routes/commentRoutes.js

import express from 'express';
import Place    from '../models/Place.js';
import Work     from '../models/Work.js';
import Character from '../models/Character.js';
import Comment  from '../models/Comment.js';
import mongoose from 'mongoose';

// 로그인된 사용자만
function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: '로그인이 필요합니다.' });
}

const router = express.Router({ mergeParams: true });

/**
 * GET  /         — 댓글 목록 조회
 * POST /         — 새 댓글 작성 (로그인 필요)
 * DELETE /:cid   — 내 댓글 삭제
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};

    if (req.params.placeId) {
      // 1) placeId가 ObjectId인지 확인
      if (mongoose.Types.ObjectId.isValid(req.params.placeId)) {
        filter.placeId = req.params.placeId;
      } else {
        // 2) ObjectId가 아니면 JSON의 id 필드로 Place를 찾아서 _id 사용
        const place = await Place.findOne({ id: req.params.placeId }).select('_id');
        if (!place) return res.status(404).json({ message: '존재하지 않는 장소입니다.' });
        filter.placeId = place._id;
      }
    }
    else if (req.params.workId) {
      // 2) workId는 문자열 id이므로 Work 컬렉션에서 _id 찾기
      const work = await Work.findOne({ id: req.params.workId }).select('_id');
      if (!work) return res.status(404).json({ message: '존재하지 않는 작품입니다.' });
      filter.workId = work._id;
    }
    else if (req.params.characterId) {
      // 3) characterId도 문자열 id이므로 Character 컬렉션에서 _id 찾기
      const ch = await Character.findOne({ id: req.params.characterId }).select('_id');
      if (!ch) return res.status(404).json({ message: '존재하지 않는 등장인물입니다.' });
      filter.characterId = ch._id;
    }

    const comments = await Comment
      .find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'displayName nickname profileImage');

    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '댓글을 불러오는 중 오류 발생' });
  }
});

router.post('/', ensureAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = new Comment({ content, userId: req.user._id });

    if (req.params.placeId) {
      // 1) placeId가 ObjectId인지 확인
      if (mongoose.Types.ObjectId.isValid(req.params.placeId)) {
        comment.placeId = req.params.placeId;
      } else {
        // 2) ObjectId가 아니면 JSON의 id 필드로 Place를 찾아서 _id 사용
        const place = await Place.findOne({ id: req.params.placeId }).select('_id');
        if (!place) return res.status(404).json({ message: '존재하지 않는 장소입니다.' });
        comment.placeId = place._id;
      }
    }
    else if (req.params.workId) {
      // 2) workId는 문자열 id이므로 Work 컬렉션에서 _id 찾기
      const work = await Work.findOne({ id: req.params.workId }).select('_id');
      if (!work) return res.status(404).json({ message: '존재하지 않는 작품입니다.' });
      comment.workId = work._id;
    }
    else if (req.params.characterId) {
      // 3) characterId도 문자열 id이므로 Character 컬렉션에서 _id 찾기
      const ch = await Character.findOne({ id: req.params.characterId }).select('_id');
      if (!ch) return res.status(404).json({ message: '존재하지 않는 등장인물입니다.' });
      comment.characterId = ch._id;
    }

    await comment.save();
    // 저장 후 바로 populate 해서 돌려주기 (닉네임까지)
    await comment.populate('userId', 'displayName nickname profileImage');
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:cid', ensureAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.cid);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (!comment.userId.equals(req.user._id)) {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }
    await comment.deleteOne();
    res.json({ message: '댓글이 삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '댓글 삭제 중 오류 발생' });
  }
});

// 댓글 수정
router.patch('/:cid', ensureAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.cid);
    if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    if (!comment.userId.equals(req.user._id)) {
      return res.status(403).json({ message: '수정 권한이 없습니다.' });
    }
    comment.content = (content || '').trim();
    comment.updatedAt = new Date();
    await comment.save();
    await comment.populate('userId', 'displayName nickname profileImage');
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '댓글 수정 중 오류 발생' });
  }
});

// 좋아요/싫어요 토글
router.post('/:cid/like', ensureAuth, async (req, res) => {
  try {
    const c = await Comment.findById(req.params.cid);
    if (!c) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    const uid = req.user._id;
    // 좋아요 토글: 있으면 제거, 없으면 추가
    const hasLiked = c.likes.some(id => id.equals(uid));
    if (hasLiked) {
      c.likes = c.likes.filter(id => !id.equals(uid));
    } else {
      c.likes.push(uid);
      // 싫어요는 동시에 해제
      c.dislikes = c.dislikes.filter(id => !id.equals(uid));
    }
    await c.save();
    res.json({ likes: c.likes.length, dislikes: c.dislikes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '좋아요 처리 중 오류' });
  }
});

router.post('/:cid/dislike', ensureAuth, async (req, res) => {
  try {
    const c = await Comment.findById(req.params.cid);
    if (!c) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    const uid = req.user._id;
    const hasDisliked = c.dislikes.some(id => id.equals(uid));
    if (hasDisliked) {
      c.dislikes = c.dislikes.filter(id => !id.equals(uid));
    } else {
      c.dislikes.push(uid);
      c.likes = c.likes.filter(id => !id.equals(uid));
    }
    await c.save();
    res.json({ likes: c.likes.length, dislikes: c.dislikes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '싫어요 처리 중 오류' });
  }
});

export default router;
