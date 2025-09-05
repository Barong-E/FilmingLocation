import mongoose from 'mongoose';

const AdminLogSchema = new mongoose.Schema({
  // 관리자 정보
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  adminUsername: {
    type: String,
    required: true
  },
  
  // 활동 정보
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout', 'create', 'update', 'delete', 'view', 'export',
      'backup', 'restore', 'user_activate', 'user_deactivate',
      'system_config', 'permission_change'
    ]
  },
  
  // 대상 정보
  targetType: {
    type: String,
    enum: ['user', 'place', 'work', 'character', 'comment', 'system', 'admin']
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  
  // 상세 정보
  description: {
    type: String,
    required: true
  },
  
  // 요청 정보
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  
  // 결과 정보
  status: {
    type: String,
    enum: ['success', 'error', 'warning'],
    default: 'success'
  },
  errorMessage: {
    type: String
  },
  
  // 메타 정보
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// 인덱스 설정 (검색 성능 향상)
AdminLogSchema.index({ adminId: 1, timestamp: -1 });
AdminLogSchema.index({ action: 1, timestamp: -1 });
AdminLogSchema.index({ targetType: 1, targetId: 1 });

// 로그 생성 헬퍼 메서드
AdminLogSchema.statics.createLog = function(logData) {
  return this.create({
    ...logData,
    timestamp: new Date()
  });
};

// 로그 조회 헬퍼 메서드
AdminLogSchema.statics.getLogsByAdmin = function(adminId, limit = 50) {
  return this.find({ adminId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('adminId', 'username displayName');
};

// 로그 조회 (전체)
AdminLogSchema.statics.getLogs = function(filters = {}, limit = 100) {
  const query = {};
  
  if (filters.adminId) query.adminId = filters.adminId;
  if (filters.action) query.action = filters.action;
  if (filters.targetType) query.targetType = filters.targetType;
  if (filters.status) query.status = filters.status;
  if (filters.startDate) query.timestamp = { $gte: filters.startDate };
  if (filters.endDate) {
    query.timestamp = query.timestamp || {};
    query.timestamp.$lte = filters.endDate;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('adminId', 'username displayName');
};

export default mongoose.model('AdminLog', AdminLogSchema);


