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
      this._createModal(); // 모달 생성
      this.bindEvents(); // 이벤트 리스너 등록
      await this.loadPlaces(); // 초기 데이터 로드
    } catch (error) {
      console.error('장소 관리 초기화 오류:', error);
    }
  }

  // 모달 HTML 생성 및 body에 추가
  _createModal() {
    const modalHTML = `
      <div id="placeModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="placeModalTitle">장소 추가</h3>
            <button class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="placeForm">
              <input type="hidden" id="placeId" name="_id">
              <div class="form-group">
                <label for="place-id">고유 ID*</label>
                <input type="text" id="place-id" name="id" required>
              </div>
              <div class="form-group">
                <label for="place-real_name">실제 장소명*</label>
                <input type="text" id="place-real_name" name="real_name" required>
              </div>
              <div class="form-group">
                <label for="place-fictional_name">작품 속 장소명</label>
                <input type="text" id="place-fictional_name" name="fictional_name">
              </div>
              <div class="form-group">
                <label for="place-address">주소*</label>
                <input type="text" id="place-address" name="address" required>
              </div>
              <div class="form-group">
                <label for="place-image">이미지 경로</label>
                <input type="text" id="place-image" name="image">
              </div>
              <div class="form-group">
                <label for="place-mapUrl">지도 URL</label>
                <input type="text" id="place-mapUrl" name="mapUrl">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary modal-close-btn">취소</button>
            <button type="submit" form="placeForm" class="btn-primary">저장</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    const modal = document.getElementById('placeModal');
    const form = document.getElementById('placeForm');

    // 검색 버튼
    document.getElementById('placeSearchBtn').addEventListener('click', () => {
      this.loadPlaces(1, document.getElementById('placeSearch').value);
    });

    // 검색 엔터키
    document.getElementById('placeSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.loadPlaces(1, e.target.value);
    });

    // CSV 내보내기 버튼
    document.getElementById('placesExportBtn').addEventListener('click', () => this.exportPlacesCSV());

    // 추가 버튼
    document.getElementById('placeAddBtn').addEventListener('click', () => this.openPlaceModal());

    // 모달 닫기 버튼
    modal.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => modal.classList.remove('active'));
    });

    // 폼 제출
    form.addEventListener('submit', (e) => this.handleFormSubmit(e));
  }

  // 폼 제출 처리
  async handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const placeId = data._id;

    const method = placeId ? 'PUT' : 'POST';
    const url = placeId ? `/api/admin/places/${placeId}` : '/api/admin/places';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify(data),
        credentials: 'include'
      });

      if (response.ok) {
        document.getElementById('placeModal').classList.remove('active');
        await this.loadPlaces(this.currentPage, this.currentSearch);
        alert(`장소가 성공적으로 ${placeId ? '수정' : '추가'}되었습니다.`);
      } else {
        const errorData = await response.json();
        alert(`오류: ${errorData.error?.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('장소 저장 오류:', error);
      alert('장소 저장 중 오류가 발생했습니다.');
    }
  }
  
  // 장소 목록 로드 (내용 동일)
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
      const displayName = place.real_name || place.fictional_name || '이름 없음';
      const displayAddress = place.address || '주소 없음';
      return `
        <tr>
          <td>${displayName}</td>
          <td>${displayAddress}</td>
          <td>${new Date(place.createdAt).toLocaleDateString()}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-view" onclick="adminPlaces.editPlace('${place._id}')">수정</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // 페이지네이션 렌더링 (내용 동일)
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
  
  // 장소 수정 모달 열기
  async editPlace(placeId) {
    try {
      const response = await fetch(`/api/admin/places/${placeId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('장소 정보를 불러오지 못했습니다.');
      
      const { place } = await response.json();
      
      document.getElementById('placeModalTitle').textContent = '장소 수정';
      document.getElementById('placeId').value = place._id;
      document.getElementById('place-id').value = place.id || '';
      document.getElementById('place-real_name').value = place.real_name || '';
      document.getElementById('place-fictional_name').value = place.fictional_name || '';
      document.getElementById('place-address').value = place.address || '';
      document.getElementById('place-image').value = place.image || '';
      document.getElementById('place-mapUrl').value = place.mapUrl || '';
      
      document.getElementById('placeModal').classList.add('active');

    } catch (error) {
      console.error('장소 수정 창 열기 오류:', error);
      alert(error.message);
    }
  }
  
  // 장소 추가 모달 열기
  openPlaceModal() {
    document.getElementById('placeModalTitle').textContent = '장소 추가';
    document.getElementById('placeForm').reset();
    document.getElementById('placeId').value = ''; // hidden id 필드 초기화
    document.getElementById('placeModal').classList.add('active');
  }
  
  // CSV 내보내기 (내용 동일)
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

