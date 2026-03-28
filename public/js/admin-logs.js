// 로그 관리 페이지 JavaScript
class AdminLogs {
  constructor() {
    this.currentPage = 1;
    this.currentLimit = 20;
    this.currentSearch = '';
    this.init();
  }
  
  // 초기화
  async init() {
    try {
      // 이벤트 리스너 등록
      this.bindEvents();
      
      // 초기 데이터 로드
      await this.loadLogs();
      
    } catch (error) {
      console.error('로그 관리 초기화 오류:', error);
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 필터 버튼
    document.getElementById('logFilterBtn').addEventListener('click', () => {
      this.applyFilters();
    });

    // CSV 내보내기 버튼
    document.getElementById('logsExportBtn').addEventListener('click', () => this.exportLogsCSV());
  }
  
  // 로그 목록 로드
  async loadLogs(page = 1, filters = {}) {
    try {
      this.currentPage = page;
      
      const params = new URLSearchParams({
        page: page,
        limit: this.currentLimit
      });
      
      // 필터 추가
      if (filters.type) params.append('type', filters.type);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      
      const response = await fetch(`/api/admin/logs?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderLogsTable(data.logs);
        this.renderPagination('logsPagination', data.pagination, (page) => this.loadLogs(page, filters));
      }
    } catch (error) {
      console.error('로그 목록 로드 오류:', error);
    }
  }
  
  // 로그 테이블 렌더링
  renderLogsTable(logs) {
    const tbody = document.getElementById('logsTableBody');
    tbody.innerHTML = logs.map(log => `
      <tr>
        <td>${new Date(log.timestamp).toLocaleString()}</td>
        <td>${log.adminId?.displayName || log.adminUsername}</td>
        <td>${this.getActionText(log.action)}</td>
        <td>${log.targetType || 'N/A'}</td>
        <td>${log.description}</td>
        <td>
          <span class="status-badge ${log.status === 'success' ? 'status-active' : 'status-inactive'}">
            ${log.status}
          </span>
        </td>
      </tr>
    `).join('');
  }
  
  // 액션 텍스트 변환
  getActionText(action) {
    const actionMap = {
      'create': '생성',
      'update': '수정',
      'delete': '삭제',
      'login': '로그인',
      'logout': '로그아웃'
    };
    return actionMap[action] || action;
  }
  
  // 페이지네이션 렌더링
  renderPagination(containerId, pagination, onPageChange) {
    const container = document.getElementById(containerId);
    const { currentPage, totalPages, hasNext, hasPrev } = pagination;
    
    let paginationHTML = '';
    
    // 이전 버튼
    paginationHTML += `
      <button ${!hasPrev ? 'disabled' : ''} onclick="adminLogs.loadLogs(${currentPage - 1}, adminLogs.currentFilters)">
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
    
    // 페이지 번호들
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      paginationHTML += `
        <button class="${i === currentPage ? 'active' : ''}" onclick="adminLogs.loadLogs(${i}, adminLogs.currentFilters)">
          ${i}
        </button>
      `;
    }
    
    // 다음 버튼
    paginationHTML += `
      <button ${!hasNext ? 'disabled' : ''} onclick="adminLogs.loadLogs(${currentPage + 1}, adminLogs.currentFilters)">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    
    container.innerHTML = paginationHTML;
  }
  
  // 필터 적용
  applyFilters() {
    const filters = {
      type: document.getElementById('logTypeFilter').value,
      dateFrom: document.getElementById('logDateFrom').value,
      dateTo: document.getElementById('logDateTo').value
    };
    
    this.currentFilters = filters;
    this.loadLogs(1, filters);
  }
  
  // CSV 내보내기
  async exportLogsCSV() {
    const res = await fetch('/api/admin/logs?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '시간', '관리자', '활동', '대상', '상세', '상태' ], ...data.logs.map(l => [new Date(l.timestamp).toLocaleString(), (l.adminId?.displayName || l.adminUsername || ''), l.action, l.targetType || '', l.description || '', l.status])];
    this.exportCSV('logs.csv', rows);
  }

  // CSV 내보내기 유틸리티
  exportCSV(filename, rows) {
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  }
}

// 전역 인스턴스 생성
window.adminLogs = new AdminLogs();

