// 사용자 관리 페이지 JavaScript
class AdminUsers {
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
      await this.loadUsers();
      
    } catch (error) {
      console.error('사용자 관리 초기화 오류:', error);
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 검색 버튼
    document.getElementById('userSearchBtn').addEventListener('click', () => {
      const query = document.getElementById('userSearch').value;
      this.loadUsers(1, query);
    });

    // 검색 엔터키
    document.getElementById('userSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = document.getElementById('userSearch').value;
        this.loadUsers(1, query);
      }
    });

    // CSV 내보내기 버튼
    document.getElementById('usersExportBtn').addEventListener('click', () => this.exportUsersCSV());
  }
  
  // 사용자 목록 로드
  async loadUsers(page = 1, search = '') {
    try {
      this.currentPage = page;
      this.currentSearch = search;
      
      const params = new URLSearchParams({
        page: page,
        limit: this.currentLimit
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderUsersTable(data.users);
        this.renderPagination('usersPagination', data.pagination, (page) => this.loadUsers(page, search));
      }
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
    }
  }
  
  // 사용자 테이블 렌더링
  renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.displayName || user.username}</td>
        <td>${user.email}</td>
        <td>
          <span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
            ${user.isActive ? '활성' : '비활성'}
          </span>
        </td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-view" onclick="adminUsers.toggleUserStatus('${user._id}')">
              ${user.isActive ? '비활성화' : '활성화'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  // 페이지네이션 렌더링
  renderPagination(containerId, pagination, onPageChange) {
    const container = document.getElementById(containerId);
    const { currentPage, totalPages, hasNext, hasPrev } = pagination;
    
    let paginationHTML = '';
    
    // 이전 버튼
    paginationHTML += `
      <button ${!hasPrev ? 'disabled' : ''} onclick="adminUsers.loadUsers(${currentPage - 1}, '${this.currentSearch}')">
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
    
    // 페이지 번호들
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      paginationHTML += `
        <button class="${i === currentPage ? 'active' : ''}" onclick="adminUsers.loadUsers(${i}, '${this.currentSearch}')">
          ${i}
        </button>
      `;
    }
    
    // 다음 버튼
    paginationHTML += `
      <button ${!hasNext ? 'disabled' : ''} onclick="adminUsers.loadUsers(${currentPage + 1}, '${this.currentSearch}')">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    
    container.innerHTML = paginationHTML;
  }
  
  // 사용자 상태 토글
  async toggleUserStatus(userId) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (response.ok) {
        alert('사용자 상태가 변경되었습니다.');
        this.loadUsers(); // 목록 새로고침
      } else {
        alert('사용자 상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('사용자 상태 토글 오류:', error);
      alert('사용자 상태 변경 중 오류가 발생했습니다.');
    }
  }
  
  // CSV 내보내기
  async exportUsersCSV() {
    const res = await fetch('/api/admin/users?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '이름', '이메일', '상태', '가입일' ], ...data.users.map(u => [u.displayName || u.username || '', u.email || '', u.isActive ? '활성' : '비활성', new Date(u.createdAt).toLocaleString()])];
    this.exportCSV('users.csv', rows);
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
window.adminUsers = new AdminUsers();

