// 장소 관리 페이지 스크립트
class PlaceManager {
  constructor() {
    this.currentPage = 1;
    this.currentLimit = 20;
    this.currentSearch = '';
    this.init();
  }

  async init() {
    await this.loadPlaces();
    this.bindEvents();
  }

  async loadPlaces(page = 1, search = '') {
    try {
      this.currentPage = page;
      this.currentSearch = search;
      
      const params = new URLSearchParams({
        page: page,
        limit: this.currentLimit,
        search: search
      });
      
      const response = await fetch(`/api/admin/places?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderPlacesTable(data.places);
        this.renderPagination(data.pagination);
      } else {
        window.adminCommon.showToast('장소 목록 로드 실패', 'error');
      }
    } catch (error) {
      console.error('장소 목록 로드 오류:', error);
      window.adminCommon.showToast('장소 목록 로드 중 오류 발생', 'error');
    }
  }

  renderPlacesTable(places) {
    const tbody = document.getElementById('placesTableBody');
    if (!tbody) return;

    tbody.innerHTML = places.map(place => {
      const displayName = place.real_name || place.fictional_name || '이름 없음';
      const displayAddress = place.address || '주소 없음';
      const created = place.createdAt ? new Date(place.createdAt).toLocaleDateString() : '';
      
      return `
        <tr>
          <td>${this.escapeHtml(displayName)}</td>
          <td>${this.escapeHtml(displayAddress)}</td>
          <td>${created}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-edit" onclick="placeManager.editPlace('${place._id}')">
                <i class="fas fa-edit"></i> 수정
              </button>
              <button class="btn-action btn-delete" onclick="placeManager.deletePlace('${place._id}')">
                <i class="fas fa-trash"></i> 삭제
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderPagination(pagination) {
    const container = document.getElementById('placesPagination');
    if (!container) return;

    const { page, pages, total } = pagination;
    let html = '<div class="pagination">';
    
    if (page > 1) {
      html += `<button class="page-btn" onclick="placeManager.loadPlaces(${page - 1}, '${this.currentSearch}')">이전</button>`;
    }
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === page ? 'active' : '';
      html += `<button class="page-btn ${activeClass}" onclick="placeManager.loadPlaces(${i}, '${this.currentSearch}')">${i}</button>`;
    }
    
    if (page < pages) {
      html += `<button class="page-btn" onclick="placeManager.loadPlaces(${page + 1}, '${this.currentSearch}')">다음</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  bindEvents() {
    // 추가 버튼 → 원본 모달 호출
    const addBtn = document.getElementById('placeAddBtn');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', () => {
        try {
          if (!window.dashboard) window.dashboard = new AdminDashboard({ autoInit: false });
          if (typeof window.dashboard.openPlaceModal === 'function') {
            window.dashboard.openPlaceModal();
          } else {
            throw new Error('openPlaceModal not available');
          }
        } catch (e) {
          console.error('Dashboard object or openPlaceModal method is not available.', e);
          window.adminCommon.showToast('모달 기능이 준비되지 않았습니다.', 'error');
        }
      });
    }

    // 검색 버튼
    const searchBtn = document.getElementById('placeSearchBtn');
    if (searchBtn && !searchBtn._bound) {
      searchBtn._bound = true;
      searchBtn.addEventListener('click', () => this.searchPlaces());
    }

    // 검색 입력 엔터키
    const searchInput = document.getElementById('placeSearch');
    if (searchInput && !searchInput._bound) {
      searchInput._bound = true;
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.searchPlaces();
      });
    }

    // CSV 내보내기
    const exportBtn = document.getElementById('placesExportBtn');
    if (exportBtn && !exportBtn._bound) {
      exportBtn._bound = true;
      exportBtn.addEventListener('click', () => this.exportCSV());
    }
  }

  searchPlaces() {
    const search = document.getElementById('placeSearch')?.value || '';
    this.loadPlaces(1, search);
  }

  addPlace() {
    this.showPlaceModal();
  }

  showPlaceModal(place = null) {
    const modalHtml = `
      <div id="placeModal" class="modal-overlay" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>${place ? '장소 수정' : '장소 추가'}</h3>
            <button class="modal-close" onclick="placeManager.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="placeForm">
              <div class="form-row">
                <label for="place-real-name">실제 장소명</label>
                <input type="text" id="place-real-name" name="real_name" placeholder="실제 장소명을 입력하세요">
              </div>
              <div class="form-row">
                <label for="place-fictional-name">가상 장소명</label>
                <input type="text" id="place-fictional-name" name="fictional_name" placeholder="작품에서 사용된 장소명을 입력하세요">
              </div>
              <div class="form-row">
                <label for="place-address">주소</label>
                <input type="text" id="place-address" name="address" placeholder="주소를 입력하세요">
              </div>
              <div class="form-row">
                <label for="place-description">설명</label>
                <textarea id="place-description" name="description" placeholder="장소에 대한 설명을 입력하세요"></textarea>
              </div>
              <div class="form-row">
                <label for="place-image">이미지 경로</label>
                <input type="text" id="place-image" name="image" placeholder="이미지 URL을 입력하세요">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button id="placeSaveBtn" class="btn btn-primary">${place ? '수정' : '추가'}</button>
            <button onclick="placeManager.closeModal()" class="btn btn-secondary">취소</button>
          </div>
        </div>
      </div>
    `;

    // 기존 모달 제거
    const existingModal = document.getElementById('placeModal');
    if (existingModal) {
      existingModal.remove();
    }

    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 기존 데이터 채우기 (수정 모드)
    if (place) {
      document.getElementById('place-real-name').value = place.real_name || '';
      document.getElementById('place-fictional-name').value = place.fictional_name || '';
      document.getElementById('place-address').value = place.address || '';
      document.getElementById('place-description').value = place.description || '';
      document.getElementById('place-image').value = place.image || '';
    }

    // 저장 버튼 이벤트
    document.getElementById('placeSaveBtn').addEventListener('click', () => {
      this.savePlace(place);
    });
  }

  closeModal() {
    const modal = document.getElementById('placeModal');
    if (modal) {
      modal.remove();
    }
  }

  async savePlace(place = null) {
    const form = document.getElementById('placeForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const url = place ? `/api/admin/places/${place._id}` : '/api/admin/places';
      const method = place ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (response.ok) {
        window.adminCommon.showToast(place ? '장소가 수정되었습니다' : '장소가 추가되었습니다', 'success');
        this.closeModal();
        this.loadPlaces(this.currentPage, this.currentSearch);
      } else {
        const error = await response.json().catch(() => ({}));
        window.adminCommon.showToast(error.error?.message || '저장 실패', 'error');
      }
    } catch (error) {
      console.error('장소 저장 오류:', error);
      window.adminCommon.showToast('저장 중 오류 발생', 'error');
    }
  }

  async editPlace(placeId) {
    try {
      if (!window.dashboard) window.dashboard = new AdminDashboard({ autoInit: false });
      if (typeof window.dashboard.openPlaceEditModal === 'function') {
        window.dashboard.openPlaceEditModal(placeId);
      } else {
        throw new Error('openPlaceEditModal not available');
      }
    } catch (e) {
      console.error('Dashboard object or openPlaceEditModal method is not available.', e);
      window.adminCommon.showToast('수정 모달을 열 수 없습니다.', 'error');
    }
  }

  async deletePlace(placeId) {
    if (!confirm('정말로 이 장소를 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/admin/places/${placeId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        window.adminCommon.showToast('장소가 삭제되었습니다', 'success');
        this.loadPlaces(this.currentPage, this.currentSearch);
      } else {
        const error = await response.json().catch(() => ({}));
        window.adminCommon.showToast(error.error?.message || '삭제 실패', 'error');
      }
    } catch (error) {
      console.error('장소 삭제 오류:', error);
      window.adminCommon.showToast('삭제 중 오류 발생', 'error');
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

// 페이지 로드 시 초기화 - 이 부분을 HTML 파일에서 직접 제어하도록 제거합니다.



