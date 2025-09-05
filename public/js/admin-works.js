// 작품 관리 페이지 JavaScript
class AdminWorks {
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
      await this.loadWorks();
      
    } catch (error) {
      console.error('작품 관리 초기화 오류:', error);
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 검색 버튼
    document.getElementById('workSearchBtn').addEventListener('click', () => {
      const query = document.getElementById('workSearch').value;
      this.loadWorks(1, query);
    });

    // 검색 엔터키
    document.getElementById('workSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = document.getElementById('workSearch').value;
        this.loadWorks(1, query);
      }
    });

    // CSV 내보내기 버튼
    document.getElementById('worksExportBtn').addEventListener('click', () => this.exportWorksCSV());

    // 추가 버튼
    document.getElementById('workAddBtn').addEventListener('click', () => this.openWorkModal());
  }
  
  // 작품 목록 로드
  async loadWorks(page = 1, search = '') {
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
      
      const response = await fetch(`/api/admin/works?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderWorksTable(data.works);
        this.renderPagination('worksPagination', data.pagination, (page) => this.loadWorks(page, search));
      }
    } catch (error) {
      console.error('작품 목록 로드 오류:', error);
    }
  }
  
  // 작품 테이블 렌더링
  renderWorksTable(works) {
    const tbody = document.getElementById('worksTableBody');
    tbody.innerHTML = works.map(work => `
      <tr>
        <td>${work.title}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-view" onclick="adminWorks.editWork('${work._id}')">수정</button>
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
      <button ${!hasPrev ? 'disabled' : ''} onclick="adminWorks.loadWorks(${currentPage - 1}, '${this.currentSearch}')">
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
    
    // 페이지 번호들
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      paginationHTML += `
        <button class="${i === currentPage ? 'active' : ''}" onclick="adminWorks.loadWorks(${i}, '${this.currentSearch}')">
          ${i}
        </button>
      `;
    }
    
    // 다음 버튼
    paginationHTML += `
      <button ${!hasNext ? 'disabled' : ''} onclick="adminWorks.loadWorks(${currentPage + 1}, '${this.currentSearch}')">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    
    container.innerHTML = paginationHTML;
  }
  
  // 작품 수정
  editWork(workId) {
    alert('작품 수정 기능은 구현 예정입니다.');
  }
  
  // 작품 추가 모달 열기
  openWorkModal() {
    alert('작품 추가 기능은 구현 예정입니다.');
  }
  
  // CSV 내보내기
  async exportWorksCSV() {
    const res = await fetch('/api/admin/works?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '제목', '타입', '공개일', '설명', '등록일' ], ...data.works.map(w => [w.title || '', w.type || '', w.releaseDate || '', w.description || '', new Date(w.createdAt).toLocaleString()])];
    this.exportCSV('works.csv', rows);
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
window.adminWorks = new AdminWorks();