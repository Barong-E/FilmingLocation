// 인물 관리 페이지 스크립트
class CharacterManager {
  constructor() {
    this.currentPage = 1;
    this.currentLimit = 20;
    this.currentSearch = '';
    this.init();
  }

  async init() {
    await this.loadCharacters();
    this.bindEvents();
  }

  async loadCharacters(page = 1, search = '') {
    try {
      this.currentPage = page;
      this.currentSearch = search;
      
      const params = new URLSearchParams({
        page: page,
        limit: this.currentLimit,
        search: search
      });
      
      const response = await fetch(`/api/admin/characters?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderCharactersTable(data.characters);
        this.renderPagination(data.pagination);
      } else {
        window.adminCommon.showToast('인물 목록 로드 실패', 'error');
      }
    } catch (error) {
      console.error('인물 목록 로드 오류:', error);
      window.adminCommon.showToast('인물 목록 로드 중 오류 발생', 'error');
    }
  }

  renderCharactersTable(characters) {
    const tbody = document.getElementById('charactersTableBody');
    if (!tbody) return;

    tbody.innerHTML = characters.map(character => {
      const name = character.name || '이름 없음';
      const description = character.description || '설명 없음';
      const created = character.createdAt ? new Date(character.createdAt).toLocaleDateString() : '';
      
      return `
        <tr>
          <td>${this.escapeHtml(name)}</td>
          <td>${this.escapeHtml(description.slice(0, 50))}${description.length > 50 ? '...' : ''}</td>
          <td>${created}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-edit" onclick="characterManager.editCharacter('${character._id}')">
                <i class="fas fa-edit"></i> 수정
              </button>
              <button class="btn-action btn-delete" onclick="characterManager.deleteCharacter('${character._id}')">
                <i class="fas fa-trash"></i> 삭제
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderPagination(pagination) {
    const container = document.getElementById('charactersPagination');
    if (!container) return;

    const { page, pages, total } = pagination;
    let html = '<div class="pagination">';
    
    if (page > 1) {
      html += `<button class="page-btn" onclick="characterManager.loadCharacters(${page - 1}, '${this.currentSearch}')">이전</button>`;
    }
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(pages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === page ? 'active' : '';
      html += `<button class="page-btn ${activeClass}" onclick="characterManager.loadCharacters(${i}, '${this.currentSearch}')">${i}</button>`;
    }
    
    if (page < pages) {
      html += `<button class="page-btn" onclick="characterManager.loadCharacters(${page + 1}, '${this.currentSearch}')">다음</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  bindEvents() {
    // 추가 버튼 → 원본 모달 호출
    const addBtn = document.getElementById('characterAddBtn');
    if (addBtn && !addBtn._bound) {
      addBtn._bound = true;
      addBtn.addEventListener('click', () => {
        try {
          if (!window.dashboard) window.dashboard = new AdminDashboard({ autoInit: false });
          if (typeof window.dashboard.openCharacterAddModal === 'function') {
            window.dashboard.openCharacterAddModal();
          } else if (typeof window.dashboard.openCharacterModal === 'function') {
            window.dashboard.openCharacterModal();
          } else {
            throw new Error('openCharacterAddModal not available');
          }
        } catch (e) {
          console.error('Dashboard object or openCharacterAddModal method is not available.', e);
          window.adminCommon.showToast('모달 기능이 준비되지 않았습니다.', 'error');
        }
      });
    }

    // 검색 버튼
    const searchBtn = document.getElementById('characterSearchBtn');
    if (searchBtn && !searchBtn._bound) {
      searchBtn._bound = true;
      searchBtn.addEventListener('click', () => this.searchCharacters());
    }

    // 검색 입력 엔터키
    const searchInput = document.getElementById('characterSearch');
    if (searchInput && !searchInput._bound) {
      searchInput._bound = true;
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.searchCharacters();
      });
    }

    // CSV 내보내기
    const exportBtn = document.getElementById('charactersExportBtn');
    if (exportBtn && !exportBtn._bound) {
      exportBtn._bound = true;
      exportBtn.addEventListener('click', () => this.exportCSV());
    }
  }

  searchCharacters() {
    const search = document.getElementById('characterSearch')?.value || '';
    this.loadCharacters(1, search);
  }

  addCharacter() {
    this.showCharacterModal();
  }

  showCharacterModal(character = null) {
    const modalHtml = `
      <div id="characterModal" class="modal-overlay" style="display: flex;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>${character ? '인물 수정' : '인물 추가'}</h3>
            <button class="modal-close" onclick="characterManager.closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form id="characterForm">
              <div class="form-row">
                <label for="character-name">인물명</label>
                <input type="text" id="character-name" name="name" placeholder="인물명을 입력하세요" required>
              </div>
              <div class="form-row">
                <label for="character-description">설명</label>
                <textarea id="character-description" name="description" placeholder="인물에 대한 설명을 입력하세요"></textarea>
              </div>
              <div class="form-row">
                <label for="character-image">이미지 경로</label>
                <input type="text" id="character-image" name="image" placeholder="이미지 URL을 입력하세요">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button id="characterSaveBtn" class="btn btn-primary">${character ? '수정' : '추가'}</button>
            <button onclick="characterManager.closeModal()" class="btn btn-secondary">취소</button>
          </div>
        </div>
      </div>
    `;

    // 기존 모달 제거
    const existingModal = document.getElementById('characterModal');
    if (existingModal) {
      existingModal.remove();
    }

    // 새 모달 추가
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 기존 데이터 채우기 (수정 모드)
    if (character) {
      document.getElementById('character-name').value = character.name || '';
      document.getElementById('character-description').value = character.description || '';
      document.getElementById('character-image').value = character.image || '';
    }

    // 저장 버튼 이벤트
    document.getElementById('characterSaveBtn').addEventListener('click', () => {
      this.saveCharacter(character);
    });
  }

  closeModal() {
    const modal = document.getElementById('characterModal');
    if (modal) {
      modal.remove();
    }
  }

  async saveCharacter(character = null) {
    const form = document.getElementById('characterForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const url = character ? `/api/admin/characters/${character._id}` : '/api/admin/characters';
      const method = character ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (response.ok) {
        window.adminCommon.showToast(character ? '인물이 수정되었습니다' : '인물이 추가되었습니다', 'success');
        this.closeModal();
        this.loadCharacters(this.currentPage, this.currentSearch);
      } else {
        const error = await response.json().catch(() => ({}));
        window.adminCommon.showToast(error.error?.message || '저장 실패', 'error');
      }
    } catch (error) {
      console.error('인물 저장 오류:', error);
      window.adminCommon.showToast('저장 중 오류 발생', 'error');
    }
  }

  async editCharacter(characterId) {
    try {
      if (!window.dashboard) window.dashboard = new AdminDashboard({ autoInit: false });
      if (typeof window.dashboard.openCharacterEditModal === 'function') {
        const response = await fetch(`/api/admin/characters/${characterId}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Character data could not be fetched.');
        const data = await response.json();
        window.dashboard.openCharacterEditModal(data.character);
      } else if (typeof window.dashboard.openCharacterModal === 'function') {
        const response = await fetch(`/api/admin/characters/${characterId}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Character data could not be fetched.');
        const data = await response.json();
        window.dashboard.openCharacterModal(data.character);
      } else {
        throw new Error('openCharacterEditModal not available');
      }
    } catch (e) {
      console.error('Dashboard object or openCharacterEditModal method is not available.', e);
      window.adminCommon.showToast('수정 모달을 열 수 없습니다.', 'error');
    }
  }

  async deleteCharacter(characterId) {
    if (!confirm('정말로 이 인물을 삭제하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/admin/characters/${characterId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        window.adminCommon.showToast('인물이 삭제되었습니다', 'success');
        this.loadCharacters(this.currentPage, this.currentSearch);
      } else {
        const error = await response.json().catch(() => ({}));
        window.adminCommon.showToast(error.error?.message || '삭제 실패', 'error');
      }
    } catch (error) {
      console.error('인물 삭제 오류:', error);
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



