// 사용자 관리 페이지 스크립트
class UserManager {
  constructor() {
    this.currentPage = 1;
    this.currentLimit = 20;
    this.currentSearch = '';
    this.init();
  }

  async init() {
    await this.loadUsers();
    this.bindEvents();
  }

  async loadUsers(page = 1, search = '') {
    try {
      this.currentPage = page;
      this.currentSearch = search;
      
      const params = new URLSearchParams({
        page: page,
        limit: this.currentLimit,
        search: search
      });
      
      const response = await fetch(`/api/admin/users?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderUsersTable(data.users);
        this.renderPagination(data.pagination);
      } else {
        window.adminCommon.showToast('사용자 목록 로드 실패', 'error');
      }
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
      window.adminCommon.showToast('사용자 목록 로드 중 오류 발생', 'error');
    }
  }

  renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="no-data">
            <div class="no-data-message">
              <i class="fas fa-search"></i>
              <p>${this.currentSearch ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}</p>
              ${this.currentSearch ? '<small>다른 검색어를 시도해보세요.</small>' : ''}
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = users.map(user => {
      const displayName = user.displayName || user.nickname || '이름 없음';
      const email = user.email || '이메일 없음';
      const status = user.isActive ? '활성' : '비활성';
      const statusClass = user.isActive ? 'status-active' : 'status-inactive';
      const created = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '';
      
      return `
        <tr>
          <td>${this.escapeHtml(displayName)}</td>
          <td>${this.escapeHtml(email)}</td>
          <td><span class="status-badge ${statusClass}">${status}</span></td>
          <td>${created}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-toggle" onclick="userManager.toggleUserStatus('${user._id}', ${!user.isActive})">
                ${user.isActive ? '비활성화' : '활성화'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderPagination(pagination) {
    const container = document.getElementById('usersPagination');
    if (!container) return;

    const { page, pages, total } = pagination;
    let html = '<div class="pagination">';
    
    if (page > 1) {
      html += `<button class="page-btn" onclick="userManager.loadUsers(${page - 1}, '${this.currentSearch}')">이전</button>`;
    }
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === page ? 'active' : '';
      html += `<button class="page-btn ${activeClass}" onclick="userManager.loadUsers(${i}, '${this.currentSearch}')">${i}</button>`;
    }
    
    if (page < pages) {
      html += `<button class="page-btn" onclick="userManager.loadUsers(${page + 1}, '${this.currentSearch}')">다음</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  bindEvents() {
    // 검색 버튼
    const searchBtn = document.getElementById('userSearchBtn');
    if (searchBtn && !searchBtn._bound) {
      searchBtn._bound = true;
      searchBtn.addEventListener('click', () => this.searchUsers());
    }

    // 검색 입력 엔터키
    const searchInput = document.getElementById('userSearch');
    if (searchInput && !searchInput._bound) {
      searchInput._bound = true;
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.searchUsers();
      });
    }

    // CSV 내보내기
    const exportBtn = document.getElementById('usersExportBtn');
    if (exportBtn && !exportBtn._bound) {
      exportBtn._bound = true;
      exportBtn.addEventListener('click', () => this.exportCSV());
    }
  }

  searchUsers() {
    const search = document.getElementById('userSearch')?.value || '';
    this.loadUsers(1, search);
  }

  async toggleUserStatus(userId, newStatus) {
    const action = newStatus ? '활성화' : '비활성화';
    const actionDesc = newStatus ? 
      '활성화하면 사용자가 로그인하고 서비스를 이용할 수 있습니다.' : 
      '비활성화하면 사용자가 로그인할 수 없고 서비스 이용이 제한됩니다.';
    
    if (!confirm(`정말로 이 사용자를 ${action}하시겠습니까?\n\n${actionDesc}`)) return;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: newStatus })
      });
      
      if (response.ok) {
        const result = await response.json();
        window.adminCommon.showToast(result.message || `사용자가 ${action}되었습니다`, 'success');
        this.loadUsers(this.currentPage, this.currentSearch);
      } else {
        const error = await response.json().catch(() => ({}));
        window.adminCommon.showToast(error.error?.message || `${action} 실패`, 'error');
      }
    } catch (error) {
      console.error('사용자 상태 변경 오류:', error);
      window.adminCommon.showToast(`${action} 중 오류 발생`, 'error');
    }
  }

  exportCSV() {
    window.adminCommon.showToast('CSV 내보내기 기능 준비 중...', 'info');
    // TODO: CSV 내보내기 기능 구현
  }

  escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.userManager = new UserManager();
  }, 0);
});



