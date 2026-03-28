// 인물 관리 페이지 JavaScript
class AdminCharacters {
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
      await this.loadCharacters();
      
    } catch (error) {
      console.error('인물 관리 초기화 오류:', error);
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 검색 버튼
    document.getElementById('characterSearchBtn').addEventListener('click', () => {
      const query = document.getElementById('characterSearch').value;
      this.loadCharacters(1, query);
    });

    // 검색 엔터키
    document.getElementById('characterSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = document.getElementById('characterSearch').value;
        this.loadCharacters(1, query);
      }
    });

    // CSV 내보내기 버튼
    document.getElementById('charactersExportBtn').addEventListener('click', () => this.exportCharactersCSV());

    // 추가 버튼
    document.getElementById('characterAddBtn').addEventListener('click', () => this.openCharacterModal());
  }
  
  // 인물 목록 로드
  async loadCharacters(page = 1, search = '') {
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
      
      const response = await fetch(`/api/admin/characters?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderCharactersTable(data.characters);
        this.renderPagination('charactersPagination', data.pagination, (page) => this.loadCharacters(page, search));
      }
    } catch (error) {
      console.error('인물 목록 로드 오류:', error);
    }
  }
  
  // 인물 테이블 렌더링
  renderCharactersTable(characters) {
    const tbody = document.getElementById('charactersTableBody');
    tbody.innerHTML = characters.map(character => `
      <tr>
        <td>${character.name}</td>
        <td>${character.description ? character.description.substring(0, 50) + '...' : 'N/A'}</td>
        <td>${new Date(character.createdAt).toLocaleDateString()}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-view" onclick="adminCharacters.editCharacter('${character._id}')">수정</button>
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
      <button ${!hasPrev ? 'disabled' : ''} onclick="adminCharacters.loadCharacters(${currentPage - 1}, '${this.currentSearch}')">
        <i class="fas fa-chevron-left"></i>
      </button>
    `;
    
    // 페이지 번호들
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      paginationHTML += `
        <button class="${i === currentPage ? 'active' : ''}" onclick="adminCharacters.loadCharacters(${i}, '${this.currentSearch}')">
          ${i}
        </button>
      `;
    }
    
    // 다음 버튼
    paginationHTML += `
      <button ${!hasNext ? 'disabled' : ''} onclick="adminCharacters.loadCharacters(${currentPage + 1}, '${this.currentSearch}')">
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
    
    container.innerHTML = paginationHTML;
  }
  
  // 인물 수정
  editCharacter(characterId) {
    alert('인물 수정 기능은 구현 예정입니다.');
  }
  
  // 인물 추가 모달 열기
  openCharacterModal() {
    alert('인물 추가 기능은 구현 예정입니다.');
  }
  
  // CSV 내보내기
  async exportCharactersCSV() {
    const res = await fetch('/api/admin/characters?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '이름', '직업', '국적', '설명', '등록일' ], ...data.characters.map(c => [c.name || '', c.job || '', c.nationality || '', c.description || '', new Date(c.createdAt).toLocaleString()])];
    this.exportCSV('characters.csv', rows);
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
window.adminCharacters = new AdminCharacters();

