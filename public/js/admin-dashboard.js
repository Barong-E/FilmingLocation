// 관리자 대시보드 JavaScript
class AdminDashboard {
  constructor() {
    this.currentAdmin = null;
    this.currentTab = 'overview';
    this.currentPage = 1;
    this.currentLimit = 20;
    
    this.init();
  }
  
  // 초기화
  async init() {
    try {
      // 관리자 인증 확인
      await this.checkAuth();
      
      // 이벤트 리스너 등록
      this.bindEvents();
      
      // URL에서 탭 정보 확인
      this.restoreTabFromURL();
      
      // 초기 데이터 로드
      await this.loadDashboardData();
      
    } catch (error) {
      console.error('대시보드 초기화 오류:', error);
      // 인증 실패 시 로그인 페이지로 리다이렉트
      window.location.href = '/admin';
    }
  }
  
  // 관리자 인증 확인
  async checkAuth() {
    try {
      console.log('인증 확인 시작...');
      const response = await fetch('/api/admin/me', {
        credentials: 'include'
      });
      
      console.log('인증 응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('인증 성공:', data);
        this.currentAdmin = data.admin;
        this.hideLoading();
        this.showDashboard();
        this.updateAdminInfo();
      } else {
        const errorData = await response.json();
        console.error('인증 실패:', errorData);
        throw new Error(`인증 실패: ${errorData.error?.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('인증 확인 오류:', error);
      throw error;
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.handleLogout();
    });
    
    // 탭 네비게이션
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab);
      });
    });
    
    // 활동 탭
    document.querySelectorAll('.activity-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchActivityTab(e.target.dataset.activity);
      });
    });
    
    // 검색 기능
    this.bindSearchEvents();

    // CSV 내보내기 버튼들
    document.getElementById('usersExportBtn')?.addEventListener('click', () => this.exportUsersCSV());
    document.getElementById('placesExportBtn')?.addEventListener('click', () => this.exportPlacesCSV());
    document.getElementById('worksExportBtn')?.addEventListener('click', () => this.exportWorksCSV());
    document.getElementById('charactersExportBtn')?.addEventListener('click', () => this.exportCharactersCSV());
    document.getElementById('logsExportBtn')?.addEventListener('click', () => this.exportLogsCSV());

    // 추가 버튼들
    document.getElementById('placeAddBtn')?.addEventListener('click', () => this.openPlaceModal());
    document.getElementById('workAddBtn')?.addEventListener('click', () => this.openWorkModal());
    document.getElementById('characterAddBtn')?.addEventListener('click', () => this.openCharacterModal());

    // 기간 셀렉트 -> 트렌드 갱신
    document.getElementById('trendDays')?.addEventListener('change', (e) => this.loadTrends(parseInt(e.target.value)));
    
    // 백업 버튼
    document.getElementById('backupBtn').addEventListener('click', () => {
      this.handleBackup();
    });
    
    // 모달 닫기
    document.querySelectorAll('.modal-close').forEach(close => {
      close.addEventListener('click', () => {
        this.closeModal();
      });
    });

    // 작품 수정 모달 닫기
    document.querySelectorAll('#workEditModal .modal-close').forEach(close => {
      close.addEventListener('click', () => {
        this.closeWorkEditModal();
      });
    });

    // 브라우저 뒤로가기/앞으로가기 처리
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.tab) {
        this.switchTabWithoutURLUpdate(event.state.tab);
      }
    });
    
    // OTP 모달 이벤트
    document.getElementById('otpConfirmBtn').addEventListener('click', () => {
      this.confirmOTP();
    });
    
    document.getElementById('otpCancelBtn').addEventListener('click', () => {
      this.closeOTPModal();
    });
  }
  
  // 검색 이벤트 바인딩
  bindSearchEvents() {
    // 사용자 검색
    document.getElementById('userSearchBtn').addEventListener('click', () => {
      this.searchUsers();
    });
    
    document.getElementById('userSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchUsers();
      }
    });
    
    // 장소 검색
    document.getElementById('placeSearchBtn').addEventListener('click', () => {
      this.searchPlaces();
    });
    
    document.getElementById('placeSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchPlaces();
      }
    });
    
    // 작품 검색
    document.getElementById('workSearchBtn').addEventListener('click', () => {
      this.searchWorks();
    });
    
    document.getElementById('workSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchWorks();
      }
    });
    
    // 인물 검색
    document.getElementById('characterSearchBtn').addEventListener('click', () => {
      this.searchCharacters();
    });
    
    document.getElementById('characterSearch').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.searchCharacters();
      }
    });
    
    // 로그 필터
    document.getElementById('logFilterBtn').addEventListener('click', () => {
      this.filterLogs();
    });
  }
  
  // 로그인 처리
  async handleLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const otpToken = document.getElementById('otpToken').value;
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, otpToken })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        this.currentAdmin = data.admin;
        this.hideLoginScreen();
        this.showDashboard();
        this.updateAdminInfo();
        await this.loadDashboardData();
      } else {
        this.showLoginError(data.error.message);
      }
    } catch (error) {
      this.showLoginError('로그인 중 오류가 발생했습니다.');
    }
  }
  
  // 로그아웃 처리
  async handleLogout() {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // 로그아웃 후 로그인 페이지로 리다이렉트
      window.location.href = '/admin';
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  }
  
  // 탭 전환
  switchTab(tabName) {
    // 네비게이션 활성화
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 콘텐츠 전환
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    this.currentTab = tabName;
    
    // URL 업데이트 (새로고침 시 탭 유지)
    this.updateURL(tabName);
    
    // 탭별 데이터 로드
    this.loadTabData(tabName);
  }

  // URL 업데이트
  updateURL(tabName) {
    const url = new URL(window.location);
    url.searchParams.set('tab', tabName);
    window.history.pushState({ tab: tabName }, '', url);
  }

  // URL에서 탭 복원
  restoreTabFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromURL = urlParams.get('tab');
    
    if (tabFromURL && ['users', 'places', 'works', 'characters', 'logs'].includes(tabFromURL)) {
      this.currentTab = tabFromURL;
      // 탭 전환 (URL 업데이트는 하지 않음)
      this.switchTabWithoutURLUpdate(tabFromURL);
    }
  }

  // URL 업데이트 없이 탭 전환 (초기 로드 시 사용)
  switchTabWithoutURLUpdate(tabName) {
    // 네비게이션 활성화
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 콘텐츠 전환
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    this.currentTab = tabName;
    
    // 탭별 데이터 로드
    this.loadTabData(tabName);
  }
  
  // 활동 탭 전환
  switchActivityTab(activityType) {
    document.querySelectorAll('.activity-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-activity="${activityType}"]`).classList.add('active');
    
    document.querySelectorAll('.activity-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`recent${activityType.charAt(0).toUpperCase() + activityType.slice(1)}`).classList.add('active');
  }
  
  // 대시보드 데이터 로드
  async loadDashboardData() {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateStats(data.stats);
        this.updateRecentActivity(data.recentActivity);
        // 차트 데이터 로드
        this.loadTrends();
        // SSE 구독 시작
        this.startLiveStream();
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
    }
  }

  // 트렌드 데이터 로드 및 차트 렌더링
  async loadTrends(days = 7) {
    try {
      const res = await fetch(`/api/admin/dashboard/trends?days=${days}`, { credentials: 'include' });
      if (!res.ok) return;
      const { labels, series } = await res.json();
      const ctx = document.getElementById('trendChart');
      if (!ctx) return;
      this.trendChart?.destroy?.();
      this.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: '신규 사용자', data: series.users, borderColor: '#4e79a7', backgroundColor: 'rgba(78,121,167,0.2)', tension: 0.3 },
            { label: '새 댓글', data: series.comments, borderColor: '#f28e2b', backgroundColor: 'rgba(242,142,43,0.2)', tension: 0.3 }
          ]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
      });
    } catch (e) {
      console.error('트렌드 로드 실패:', e);
    }
  }

  // SSE 실시간 업데이트
  startLiveStream() {
    try {
      this.es?.close?.();
      this.es = new EventSource('/api/admin/dashboard/stream');
      this.es.addEventListener('stats', (ev) => {
        try {
          const stats = JSON.parse(ev.data);
          this.updateStats(stats);
        } catch (_) {}
      });
      this.es.addEventListener('error', () => {/* noop */});
    } catch (e) {
      console.warn('SSE 미지원 또는 실패');
    }
  }

  // CSV 내보내기 유틸
  exportCSV(filename, rows) {
    const csv = rows.map(r => r.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // CSV 내보내기 구현들(간단히 현재 페이지 데이터를 다시 요청해 추출)
  async exportUsersCSV() {
    const res = await fetch('/api/admin/users?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '이름', '이메일', '가입일', '상태' ], ...data.users.map(u => [u.displayName || '', u.email, new Date(u.createdAt).toLocaleString(), u.isActive ? '활성' : '비활성'])];
    this.exportCSV('users.csv', rows);
  }

  async exportPlacesCSV() {
    const res = await fetch('/api/admin/places?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '실제명', '가명', '주소', '등록일' ], ...data.places.map(p => [p.real_name || '', p.fictional_name || '', p.address || '', new Date(p.createdAt).toLocaleString()])];
    this.exportCSV('places.csv', rows);
  }

  async exportWorksCSV() {
    const res = await fetch('/api/admin/works?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '제목', '타입', '공개일', '설명', '등록일' ], ...data.works.map(w => [w.title || '', w.type || '', w.releaseDate || '', w.description || '', new Date(w.createdAt).toLocaleString()])];
    this.exportCSV('works.csv', rows);
  }

  async exportCharactersCSV() {
    const res = await fetch('/api/admin/characters?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '이름', '직업', '국적', '설명', '등록일' ], ...data.characters.map(c => [c.name || '', c.job || '', c.nationality || '', c.description || '', new Date(c.createdAt).toLocaleString()])];
    this.exportCSV('characters.csv', rows);
  }

  async exportLogsCSV() {
    const res = await fetch('/api/admin/logs?page=1&limit=500', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    const rows = [[ '시간', '관리자', '활동', '대상', '상세', '상태' ], ...data.logs.map(l => [new Date(l.timestamp).toLocaleString(), (l.adminId?.displayName || l.adminUsername || ''), l.action, l.targetType || '', l.description || '', l.status])];
    this.exportCSV('logs.csv', rows);
  }

  // 간단한 생성/수정 모달 (최소 구현)
  openPlaceModal(place = null) {
    const body = document.getElementById('modalBody');
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = place ? '장소 수정' : '장소 추가';
    body.innerHTML = `
      <div class="form-row"><label>실제명</label><input id="f-real" value="${place?.real_name || ''}"></div>
      <div class="form-row"><label>가명</label><input id="f-fic" value="${place?.fictional_name || ''}"></div>
      <div class="form-row"><label>주소</label><input id="f-addr" value="${place?.address || ''}"></div>
      <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
        <button id="modalSave" class="btn-primary">저장</button>
      </div>
    `;
    document.getElementById('modalSave').onclick = async () => {
      const payload = { real_name: document.getElementById('f-real').value, fictional_name: document.getElementById('f-fic').value, address: document.getElementById('f-addr').value };
      const url = place ? `/api/admin/places/${place._id}` : '/api/admin/places';
      const method = place ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      if (res.ok) { this.closeModal(); this.loadPlaces(); } else { alert('저장 실패'); }
    };
  }

  openWorkModal(work = null) {
    const body = document.getElementById('modalBody');
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = work ? '작품 수정' : '작품 추가';
    body.innerHTML = `
      <div class="form-row"><label>제목</label><input id="w-title" value="${work?.title || ''}"></div>
      <div class="form-row"><label>타입</label><input id="w-type" value="${work?.type || ''}"></div>
      <div class="form-row"><label>공개일</label><input id="w-date" value="${work?.releaseDate || ''}"></div>
      <div class="form-row"><label>설명</label><textarea id="w-desc">${work?.description || ''}</textarea></div>
      <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
        <button id="modalSave" class="btn-primary">저장</button>
      </div>
    `;
    document.getElementById('modalSave').onclick = async () => {
      const payload = { title: document.getElementById('w-title').value, type: document.getElementById('w-type').value, releaseDate: document.getElementById('w-date').value, description: document.getElementById('w-desc').value };
      const url = work ? `/api/admin/works/${work._id}` : '/api/admin/works';
      const method = work ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      if (res.ok) { this.closeModal(); this.loadWorks(); } else { alert('저장 실패'); }
    };
  }

  openCharacterModal(character = null) {
    const body = document.getElementById('modalBody');
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = character ? '인물 수정' : '인물 추가';
    body.innerHTML = `
      <div class="form-row"><label>이름</label><input id="c-name" value="${character?.name || ''}"></div>
      <div class="form-row"><label>직업</label><input id="c-job" value="${character?.job || ''}"></div>
      <div class="form-row"><label>설명</label><textarea id="c-desc">${character?.description || ''}</textarea></div>
      <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
        <button id="modalSave" class="btn-primary">저장</button>
      </div>
    `;
    document.getElementById('modalSave').onclick = async () => {
      const payload = { name: document.getElementById('c-name').value, job: document.getElementById('c-job').value, description: document.getElementById('c-desc').value };
      const url = character ? `/api/admin/characters/${character._id}` : '/api/admin/characters';
      const method = character ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      if (res.ok) { this.closeModal(); this.loadCharacters(); } else { alert('저장 실패'); }
    };
  }
  
  // 탭별 데이터 로드
  async loadTabData(tabName) {
    switch (tabName) {
      case 'users':
        await this.loadUsers();
        break;
      case 'places':
        await this.loadPlaces();
        break;
      case 'works':
        await this.loadWorks();
        break;
      case 'characters':
        await this.loadCharacters();
        break;
      case 'logs':
        await this.loadLogs();
        break;
    }
  }
  
  // 통계 업데이트
  updateStats(stats) {
    document.getElementById('userCount').textContent = stats.users;
    document.getElementById('placeCount').textContent = stats.places;
    document.getElementById('workCount').textContent = stats.works;
    document.getElementById('characterCount').textContent = stats.characters;
    document.getElementById('commentCount').textContent = stats.comments;
  }
  
  // 최근 활동 업데이트
  updateRecentActivity(activity) {
    // 최근 사용자
    const usersList = document.getElementById('recentUsersList');
    usersList.innerHTML = activity.users.map(user => `
      <div class="activity-item">
        <div class="activity-info">
          <div class="activity-title">${user.displayName || user.email}</div>
          <div class="activity-time">${new Date(user.createdAt).toLocaleString()}</div>
        </div>
      </div>
    `).join('');
    
    // 최근 댓글
    const commentsList = document.getElementById('recentCommentsList');
    commentsList.innerHTML = activity.comments.map(comment => `
      <div class="activity-item">
        <div class="activity-info">
          <div class="activity-title">${comment.userId?.displayName || '알 수 없음'}</div>
          <div class="activity-time">${comment.content.substring(0, 50)}...</div>
        </div>
      </div>
    `).join('');
    
    // 관리자 활동 로그
    const logsList = document.getElementById('recentLogsList');
    logsList.innerHTML = activity.adminLogs.map(log => `
      <div class="activity-item">
        <div class="activity-info">
          <div class="activity-title">${log.adminId?.displayName || log.adminUsername}</div>
          <div class="activity-time">${log.description}</div>
        </div>
      </div>
    `).join('');
  }
  
  // 사용자 목록 로드
  async loadUsers(page = 1, search = '') {
    try {
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
        this.renderPagination('usersPagination', data.pagination, (page) => this.loadUsers(page, search));
      }
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
    }
  }
  
  // 장소 목록 로드
  async loadPlaces(page = 1, search = '') {
    try {
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
        this.renderPagination('placesPagination', data.pagination, (page) => this.loadPlaces(page, search));
      }
    } catch (error) {
      console.error('장소 목록 로드 오류:', error);
    }
  }
  
  // 작품 목록 로드
  async loadWorks(page = 1, search = '') {
    try {
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
        this.renderPagination('worksPagination', data.pagination, (page) => this.loadWorks(page, search));
      }
    } catch (error) {
      console.error('작품 목록 로드 오류:', error);
    }
  }
  
  // 인물 목록 로드
  async loadCharacters(page = 1, search = '') {
    try {
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
        this.renderPagination('charactersPagination', data.pagination, (page) => this.loadCharacters(page, search));
      }
    } catch (error) {
      console.error('인물 목록 로드 오류:', error);
    }
  }
  
  // 로그 목록 로드
  async loadLogs(page = 1, filters = {}) {
    try {
      const params = new URLSearchParams({
        page: page,
        limit: 50,
        ...filters
      });
      
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
  
  // 사용자 테이블 렌더링
  renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
      <tr>
        <td>${user.displayName || 'N/A'}</td>
        <td>${user.email}</td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>
          <span class="status-badge ${user.isActive ? 'status-active' : 'status-inactive'}">
            ${user.isActive ? '활성' : '비활성'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-view" onclick="dashboard.viewUser('${user._id}')">보기</button>
            <button class="btn-action btn-edit" onclick="dashboard.toggleUserStatus('${user._id}', ${!user.isActive})">
              ${user.isActive ? '비활성화' : '활성화'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
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
          <td>${place.address || 'N/A'}</td>
          <td>${new Date(place.createdAt).toLocaleDateString()}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-view" onclick="dashboard.viewPlace('${place._id}')">보기</button>
              <button class="btn-action btn-edit" onclick="dashboard.editPlace('${place._id}')">수정</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  
  // 작품 테이블 렌더링
  renderWorksTable(works) {
    const tbody = document.getElementById('worksTableBody');
    tbody.innerHTML = works.map(work => `
      <tr>
        <td>${work.title}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-view" onclick="dashboard.openWorkEditModal('${work._id}')">수정</button>
          </div>
        </td>
      </tr>
    `).join('');
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
            <button class="btn-action btn-view" onclick="dashboard.viewCharacter('${character._id}')">보기</button>
            <button class="btn-action btn-edit" onclick="dashboard.editCharacter('${character._id}')">수정</button>
          </div>
        </td>
      </tr>
    `).join('');
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
  
  // 페이지네이션 렌더링
  renderPagination(containerId, pagination, onPageChange) {
    const container = document.getElementById(containerId);
    const { page, pages, total } = pagination;
    
    let html = '';
    
    // 이전 버튼
    html += `<button ${page <= 1 ? 'disabled' : ''} onclick="dashboard.changePage(${page - 1}, '${onPageChange}')">이전</button>`;
    
    // 페이지 번호
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
      html += `<button class="${i === page ? 'active' : ''}" onclick="dashboard.changePage(${i}, '${onPageChange}')">${i}</button>`;
    }
    
    // 다음 버튼
    html += `<button ${page >= pages ? 'disabled' : ''} onclick="dashboard.changePage(${page + 1}, '${onPageChange}')">다음</button>`;
    
    container.innerHTML = html;
  }
  
  // 페이지 변경
  changePage(page, callbackName) {
    // 콜백 함수 실행 (간단한 구현)
    if (callbackName.includes('loadUsers')) {
      this.loadUsers(page);
    } else if (callbackName.includes('loadPlaces')) {
      this.loadPlaces(page);
    } else if (callbackName.includes('loadWorks')) {
      this.loadWorks(page);
    } else if (callbackName.includes('loadCharacters')) {
      this.loadCharacters(page);
    } else if (callbackName.includes('loadLogs')) {
      this.loadLogs(page);
    }
  }
  
  // 검색 기능
  searchUsers() {
    const search = document.getElementById('userSearch').value;
    this.loadUsers(1, search);
  }
  
  searchPlaces() {
    const search = document.getElementById('placeSearch').value;
    this.loadPlaces(1, search);
  }
  
  searchWorks() {
    const search = document.getElementById('workSearch').value;
    this.loadWorks(1, search);
  }
  
  searchCharacters() {
    const search = document.getElementById('characterSearch').value;
    this.loadCharacters(1, search);
  }
  
  filterLogs() {
    const action = document.getElementById('logAction').value;
    const startDate = document.getElementById('logStartDate').value;
    const endDate = document.getElementById('logEndDate').value;
    
    const filters = {};
    if (action) filters.action = action;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    this.loadLogs(1, filters);
  }
  
  // 사용자 상태 토글
  async toggleUserStatus(userId, isActive) {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive })
      });
      
      if (response.ok) {
        // 현재 페이지 다시 로드
        this.loadUsers(this.currentPage);
      } else {
        const data = await response.json();
        alert(data.error.message);
      }
    } catch (error) {
      console.error('사용자 상태 변경 오류:', error);
      alert('사용자 상태 변경 중 오류가 발생했습니다.');
    }
  }
  
  // 백업 처리
  async handleBackup() {
    // OTP 모달 표시
    this.showOTPModal();
  }
  
  // OTP 모달 표시
  showOTPModal() {
    document.getElementById('otpModal').style.display = 'flex';
  }
  
  // OTP 모달 닫기
  closeOTPModal() {
    document.getElementById('otpModal').style.display = 'none';
    document.getElementById('otpInput').value = '';
  }
  
  // OTP 확인
  async confirmOTP() {
    const otpToken = document.getElementById('otpInput').value;
    
    if (!otpToken) {
      alert('OTP 코드를 입력하세요.');
      return;
    }
    
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-OTP-Token': otpToken
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        // 파일 다운로드
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filo-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.closeOTPModal();
        alert('백업이 완료되었습니다.');
      } else {
        const data = await response.json();
        alert(data.error.message);
      }
    } catch (error) {
      console.error('백업 오류:', error);
      alert('백업 중 오류가 발생했습니다.');
    }
  }
  
  // 모달 닫기
  closeModal() {
    document.getElementById('modal').style.display = 'none';
  }

  // 작품 수정 모달 열기
  async openWorkEditModal(workId) {
    try {
      // 작품 정보 가져오기
      const workRes = await fetch(`/api/admin/works/${workId}`, { credentials: 'include' });
      if (!workRes.ok) throw new Error('작품 정보를 불러올 수 없습니다.');
      const workResponse = await workRes.json();
      const work = workResponse.work; // API 응답에서 work 객체 추출

      // 캐릭터 정보 가져오기
      const charactersRes = await fetch('/api/admin/characters?page=1&limit=1000', { credentials: 'include' });
      const charactersData = charactersRes.ok ? await charactersRes.json() : { characters: [] };

      // 장소 정보 가져오기
      const placesRes = await fetch('/api/admin/places?page=1&limit=1000', { credentials: 'include' });
      const placesData = placesRes.ok ? await placesRes.json() : { places: [] };

      // 모달에 데이터 채우기
      this.populateWorkEditModal(work, charactersData.characters, placesData.places);
      
      // 모달 표시
      document.getElementById('workEditModal').style.display = 'flex';
      
    } catch (error) {
      console.error('작품 수정 모달 열기 오류:', error);
      alert('작품 정보를 불러오는 중 오류가 발생했습니다.');
    }
  }

  // 작품 수정 모달 데이터 채우기
  populateWorkEditModal(work, allCharacters, allPlaces) {
    console.log('작품 데이터:', work); // 디버깅용
    
    // 기본 필드 채우기
    document.getElementById('work-title').value = work.title || '';
    document.getElementById('work-type').value = work.type || '';
    document.getElementById('work-releaseDate').value = work.releaseDate || '';
    document.getElementById('work-description').value = work.description || '';
    document.getElementById('work-image').value = work.image || '';

    // 등장인물 리스트 채우기
    this.populateEditableList('work-characters', work.characters || [], 'characters');

    // 캐릭터 ID 리스트 채우기 (populate된 객체에서 이름 추출)
    const characterNames = (work.characterIds || []).map(character => {
      if (typeof character === 'object' && character.name) {
        return character.name;
      } else if (typeof character === 'string') {
        // ID인 경우 allCharacters에서 찾기
        const foundCharacter = allCharacters.find(c => c._id === character);
        return foundCharacter ? foundCharacter.name : character;
      }
      return character;
    });
    this.populateEditableList('work-characterIds', characterNames, 'characterIds');

    // 장소 ID 리스트 채우기 (populate된 객체에서 이름 추출)
    const placeNames = (work.placeIds || []).map(place => {
      if (typeof place === 'object') {
        return place.real_name || place.fictional_name || place._id;
      } else if (typeof place === 'string') {
        // ID인 경우 allPlaces에서 찾기
        const foundPlace = allPlaces.find(p => p._id === place);
        return foundPlace ? (foundPlace.real_name || foundPlace.fictional_name || place) : place;
      }
      return place;
    });
    this.populateEditableList('work-placeIds', placeNames, 'placeIds');

    // 저장 버튼 이벤트 리스너
    document.getElementById('work-save-btn').onclick = () => this.saveWorkEdit(work._id);
    
    // 취소 버튼 이벤트 리스너
    document.getElementById('work-cancel-btn').onclick = () => this.closeWorkEditModal();
  }

  // 편집 가능한 리스트 채우기
  populateEditableList(containerId, items, fieldType) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    items.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = 'editable-item';
      itemElement.innerHTML = `
        <span class="item-text">${item}</span>
        <span class="remove-btn" onclick="dashboard.removeEditableItem('${containerId}', ${index})">&times;</span>
      `;
      container.appendChild(itemElement);
    });

    // 기존 이벤트 리스너 제거 후 새로 등록
    container.removeEventListener('click', this.handleEditableListClick);
    this.handleEditableListClick = (e) => {
      if (e.target.classList.contains('item-text')) {
        this.editEditableItem(e.target);
      }
    };
    container.addEventListener('click', this.handleEditableListClick);
  }

  // 편집 가능한 아이템 편집 모드 활성화
  editEditableItem(textElement) {
    const currentValue = textElement.textContent;
    const input = document.createElement('input');
    input.value = currentValue;
    input.addEventListener('blur', () => {
      textElement.textContent = input.value;
      textElement.parentElement.classList.remove('editing');
    });
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        textElement.textContent = input.value;
        textElement.parentElement.classList.remove('editing');
      }
    });
    
    textElement.parentElement.classList.add('editing');
    textElement.textContent = '';
    textElement.appendChild(input);
    input.focus();
  }

  // 편집 가능한 아이템 제거
  removeEditableItem(containerId, index) {
    const container = document.getElementById(containerId);
    const items = container.querySelectorAll('.editable-item');
    if (items[index]) {
      items[index].remove();
    }
  }

  // 작품 수정 저장
  async saveWorkEdit(workId) {
    try {
      // 폼 데이터 수집
      const title = document.getElementById('work-title').value;
      const type = document.getElementById('work-type').value;
      const releaseDate = document.getElementById('work-releaseDate').value;
      const description = document.getElementById('work-description').value;
      const image = document.getElementById('work-image').value;
      
      // 리스트 데이터 수집
      const characters = Array.from(document.getElementById('work-characters').querySelectorAll('.item-text'))
        .map(el => el.textContent).filter(text => text.trim());
      
      const characterNames = Array.from(document.getElementById('work-characterIds').querySelectorAll('.item-text'))
        .map(el => el.textContent).filter(text => text.trim());
      
      const placeNames = Array.from(document.getElementById('work-placeIds').querySelectorAll('.item-text'))
        .map(el => el.textContent).filter(text => text.trim());

      const payload = {
        title,
        type,
        releaseDate,
        description,
        image,
        characters,
        characterNames, // 서버에서 ID로 변환하도록
        placeNames      // 서버에서 ID로 변환하도록
      };

      const response = await fetch(`/api/admin/works/${workId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('작품이 성공적으로 수정되었습니다.');
        this.closeWorkEditModal();
        this.loadWorks(); // 목록 새로고침
      } else {
        throw new Error('작품 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('작품 수정 오류:', error);
      alert('작품 수정 중 오류가 발생했습니다.');
    }
  }

  // 작품 수정 모달 닫기
  closeWorkEditModal() {
    document.getElementById('workEditModal').style.display = 'none';
  }
  
  // UI 표시/숨김
  hideLoading() {
    document.getElementById('loading').style.display = 'none';
  }
  
  showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
  }
  
  hideLoginScreen() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
  }
  
  showDashboard() {
    document.getElementById('dashboard').style.display = 'flex';
  }
  
  updateAdminInfo() {
    if (this.currentAdmin) {
      document.getElementById('adminName').textContent = this.currentAdmin.displayName;
    }
  }
  
  showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 5000);
  }
  
  // 유틸리티 함수
  getActionText(action) {
    const actionMap = {
      'login': '로그인',
      'logout': '로그아웃',
      'create': '생성',
      'update': '수정',
      'delete': '삭제',
      'view': '조회',
      'export': '내보내기',
      'backup': '백업',
      'restore': '복원',
      'user_activate': '사용자 활성화',
      'user_deactivate': '사용자 비활성화',
      'system_config': '시스템 설정',
      'permission_change': '권한 변경'
    };
    
    return actionMap[action] || action;
  }
  
  // 뷰 함수들 (미구현)
  viewUser(userId) {
    alert(`사용자 ${userId} 상세 정보 (미구현)`);
  }
  
  viewPlace(placeId) {
    alert(`장소 ${placeId} 상세 정보 (미구현)`);
  }
  
  viewWork(workId) {
    alert(`작품 ${workId} 상세 정보 (미구현)`);
  }
  
  viewCharacter(characterId) {
    alert(`인물 ${characterId} 상세 정보 (미구현)`);
  }
  
  editPlace(placeId) {
    alert(`장소 ${placeId} 수정 (미구현)`);
  }
  
  editWork(workId) {
    alert(`작품 ${workId} 수정 (미구현)`);
  }
  
  editCharacter(characterId) {
    alert(`인물 ${characterId} 수정 (미구현)`);
  }
}

// 전역 변수로 대시보드 인스턴스 생성
let dashboard;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new AdminDashboard();
});
