// 장소 관리 페이지 JavaScript
class AdminPlaces {
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
      await this.loadPlaces();
      
    } catch (error) {
      console.error('장소 관리 초기화 오류:', error);
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 검색 버튼
    document.getElementById('placeSearchBtn').addEventListener('click', () => {
      const query = document.getElementById('placeSearch').value;
      this.loadPlaces(1, query);
    });

    // 검색 엔터키
    document.getElementById('placeSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = document.getElementById('placeSearch').value;
        this.loadPlaces(1, query);
      }
    });

    // CSV 내보내기 버튼
    document.getElementById('placesExportBtn').addEventListener('click', () => this.exportPlacesCSV());

    // 추가 버튼
    document.getElementById('placeAddBtn').addEventListener('click', () => this.openPlaceModal());
  }
  
  // 장소 목록 로드
  async loadPlaces(page = 1, search = '') {
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
      
      const response = await fetch(`/api/admin/places?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderPlacesTable(data.places);
        this.renderPagination('placesPagination', data.pagination, (page) => this.loadPlaces(page, search));
      }
    } catch (error) {
      console.error('장소 목록 로드 오류:', error);
    }
  }
  
  // 장소 테이블 렌더링
  renderPlacesTable(places) {
    const tbody = document.getElementById('placesTableBody');
    tbody.innerHTML = places.map(place => {
      // 장소명 표시 로직: 실제명이 있으면 실제명, 없으면 가명, 둘 다 없으면 '이름 없음'
      const displayName = place.real_name || place.fictional_name || '이름 없음';
      
      return `
        <tr>
          <td>${displayName}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-view" onclick="adminPlaces.editPlace('${place._id}')">수정</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // 페이지네이션 렌더링
  renderPagination(containerId, pagination, onPageChange) {
    const container = document.getElementById(containerId);
    const { currentPage, totalPages, hasNext, hasPrev } = pagination;
    
    let paginationHTML = '';
    
    // 이전 버튼
    paginationHTML += `
      <button ${!hasPrev ? 'disabled' : ''} onclick="adminPlaces.loadPlaces(${currentPage - 1}, '${this.currentSearch}')">
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
    
    // 페이지 번호들
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      paginationHTML += `
        <button class="${i === currentPage ? 'active' : ''}" onclick="adminPlaces.loadPlaces(${i}, '${this.currentSearch}')">
          ${i}
        </button>
      `;
    }
    
    // 다음 버튼
    paginationHTML += `
      <button ${!hasNext ? 'disabled' : ''} onclick="adminPlaces.loadPlaces(${currentPage + 1}, '${this.currentSearch}')">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    
    container.innerHTML = paginationHTML;
  }
  
  // 장소 수정
  editPlace(placeId) {
    alert('장소 수정 기능은 구현 예정입니다.');
  }
  
  // 장소 추가 모달 열기
  openPlaceModal() {
    alert('장소 추가 기능은 구현 예정입니다.');
  }
  
  // CSV 내보내기
  async exportPlacesCSV() {
    const res = await fetch('/api/admin/places?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '실제명', '가명' ], ...data.places.map(p => [p.real_name || '', p.fictional_name || ''])];
    this.exportCSV('places.csv', rows);
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
window.adminPlaces = new AdminPlaces();

