// models/Comment.js
import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // place, work, character 중 하나에 달릴 댓글로 확장
  placeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Place'
  },
  workId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Work'
  },
  characterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Character'
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  updatedAt: { type: Date },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  dislikes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// placeId, workId, characterId 중 하나는 반드시 있어야 하도록
commentSchema.pre('validate', function(next) {
  if (!this.placeId && !this.workId && !this.characterId) {
    next(new Error('댓글 대상(placeId, workId, characterId) 중 하나는 필수입니다.'));
  } else {
    next();
  }
});

export default mongoose.model('Comment', commentSchema);
