// 작품 관리 페이지 스크립트
class WorkManager {
  constructor() {
    this.currentPage = 1;
    this.currentLimit = 20;
    this.currentSearch = '';
    this.init();
  }

  async init() {
    await this.loadWorks();
    this.bindEvents();
  }

  async loadWorks(page = 1, search = '') {
    try {
      this.currentPage = page;
      this.currentSearch = search;
      
      const params = new URLSearchParams({
        page: page,
        limit: this.currentLimit,
        search: search
      });
      
      const response = await fetch(`/api/admin/works?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderWorksTable(data.works);
        this.renderPagination(data.pagination);
      } else {
        window.adminCommon.showToast('작품 목록 로드 실패', 'error');
      }
    } catch (error) {
      console.error('작품 목록 로드 오류:', error);
      window.adminCommon.showToast('작품 목록 로드 중 오류 발생', 'error');
    }
  }

  renderWorksTable(works) {
    const tbody = document.getElementById('worksTableBody');
    if (!tbody) return;

    tbody.innerHTML = works.map(work => {
      const title = work.title || '제목 없음';
      const type = work.type || '타입 없음';
      
      return `
        <tr>
          <td>
            <div class="work-info">
              <strong>${this.escapeHtml(title)}</strong>
              <span class="work-type">${this.escapeHtml(type)}</span>
            </div>
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-edit" onclick="workManager.editWork('${work._id}')">
                <i class="fas fa-edit"></i> 수정
              </button>
              <button class="btn-action btn-delete" onclick="workManager.deleteWork('${work._id}')">
                <i class="fas fa-trash"></i> 삭제
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderPagination(pagination) {
    const container = document.getElementById('worksPagination');
    if (!container) return;

    const { page, pages, total } = pagination;
    let html = '<div class="pagination">';
    
    if (page > 1) {
      html += `<button class="page-btn" onclick="workManager.loadWorks(${page - 1}, '${this.currentSearch}')">이전</button>`;
    }
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === page ? 'active' : '';
      html += `<button class="page-btn ${activeClass}" onclick="workManager.loadWorks(${i}, '${this.currentSearch}')">${i}</button>`;
    }
    
    if (page < pages) {
      html += `<button class="page-btn" onclick="workManager.loadWorks(${page + 1}, '${this.currentSearch}')">다음</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  bindEvents() {
    // 추가 버튼 → 원본 모달 호출
    const addBtn = document.getElementById('workAddBtn');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', () => {
        try {
          if (!window.dashboard) window.dashboard = new AdminDashboard({ autoInit: false });
          if (typeof window.dashboard.openWorkModal === 'function') {
            window.dashboard.openWorkModal();
          } else {
            throw new Error('openWorkModal not available');
          }
        } catch (e) {
          console.error('Dashboard object or openWorkModal method is not available.', e);
          window.adminCommon.showToast('모달 기능이 준비되지 않았습니다.', 'error');
        }
      });
    }

    // 검색 버튼
    const searchBtn = document.getElementById('workSearchBtn');
    if (searchBtn && !searchBtn._bound) {
      searchBtn._bound = true;
      searchBtn.addEventListener('click', () => this.searchWorks());
    }

    // 검색 입력 엔터키
    const searchInput = document.getElementById('workSearch');
    if (searchInput && !searchInput._bound) {
      searchInput._bound = true;
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.searchWorks();
      });
    }

    // CSV 내보내기
    const exportBtn = document.getElementById('worksExportBtn');
    if (exportBtn && !exportBtn._bound) {
      exportBtn._bound = true;
      exportBtn.addEventListener('click', () => this.exportCSV());
    }
  }

  searchWorks() {
    const search = document.getElementById('workSearch')?.value || '';
    this.loadWorks(1, search);
  }

  addWork() { this.showWorkModal(); }

  showWorkModal(work = null) {
    const modalHtml = `
      <div id="workModal" class="modal-overlay" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>${work ? '작품 수정' : '작품 추가'}</h3>
            <button class="modal-close" onclick="workManager.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="workForm">
              <div class="form-row">
                <label for="work-title">작품명</label>
                <input type="text" id="work-title" name="title" placeholder="작품명을 입력하세요" required>
              </div>
              <div class="form-row">
                <label for="work-type">작품 타입</label>
                <select id="work-type" name="type" required>
                  <option value="">타입을 선택하세요</option>
                  <option value="영화">영화</option>
                  <option value="드라마">드라마</option>
                  <option value="애니메이션">애니메이션</option>
                  <option value="다큐멘터리">다큐멘터리</option>
                  <option value="기타">기타</option>
                </select>
              </div>
              <div class="form-row">
                <label for="work-release-date">개봉일</label>
                <input type="date" id="work-release-date" name="releaseDate">
              </div>
              <div class="form-row">
                <label for="work-description">설명</label>
                <textarea id="work-description" name="description" placeholder="작품에 대한 설명을 입력하세요"></textarea>
              </div>
              <div class="form-row">
                <label for="work-image">이미지 경로</label>
                <input type="text" id="work-image" name="image" placeholder="이미지 URL을 입력하세요">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button id="workSaveBtn" class="btn btn-primary">${work ? '수정' : '추가'}</button>
            <button onclick="workManager.closeModal()" class="btn btn-secondary">취소</button>
          </div>
        </div>
      </div>
    `;

    // 기존 모달 제거
    const existingModal = document.getElementById('workModal');
    if (existingModal) {
      existingModal.remove();
    }

    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 기존 데이터 채우기 (수정 모드)
    if (work) {
      document.getElementById('work-title').value = work.title || '';
      document.getElementById('work-type').value = work.type || '';
      document.getElementById('work-release-date').value = work.releaseDate || '';
      document.getElementById('work-description').value = work.description || '';
      document.getElementById('work-image').value = work.image || '';
    }

    // 저장 버튼 이벤트
    document.getElementById('workSaveBtn').addEventListener('click', () => {
      this.saveWork(work);
    });
  }

  closeModal() {
    const modal = document.getElementById('workModal');
    if (modal) {
      modal.remove();
    }
  }

  async saveWork(work = null) {
    const form = document.getElementById('workForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const url = work ? `/api/admin/works/${work._id}` : '/api/admin/works';
      const method = work ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (response.ok) {
        window.adminCommon.showToast(work ? '작품이 수정되었습니다' : '작품이 추가되었습니다', 'success');
        this.closeModal();
        this.loadWorks(this.currentPage, this.currentSearch);
      } else {
        const error = await response.json().catch(() => ({}));
        window.adminCommon.showToast(error.error?.message || '저장 실패', 'error');
      }
    } catch (error) {
      console.error('작품 저장 오류:', error);
      window.adminCommon.showToast('저장 중 오류 발생', 'error');
    }
  }

  async editWork(workId) {
    try {
      if (!window.dashboard) window.dashboard = new AdminDashboard({ autoInit: false });
      if (typeof window.dashboard.openWorkEditModal === 'function') {
        window.dashboard.openWorkEditModal(workId);
      } else {
        throw new Error('openWorkEditModal not available');
      }
    } catch (e) {
      console.error('Dashboard object or openWorkEditModal method is not available.', e);
      window.adminCommon.showToast('수정 모달을 열 수 없습니다.', 'error');
    }
  }

  async deleteWork(workId) {
    if (!confirm('정말로 이 작품을 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/admin/works/${workId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        window.adminCommon.showToast('작품이 삭제되었습니다', 'success');
        this.loadWorks(this.currentPage, this.currentSearch);
      } else {
        const error = await response.json().catch(() => ({}));
        window.adminCommon.showToast(error.error?.message || '삭제 실패', 'error');
      }
    } catch (error) {
      console.error('작품 삭제 오류:', error);
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



