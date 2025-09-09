// 관리자 대시보드 JavaScript
const ENABLE_LIVE_STATS = false; // 새로고침 시에만 갱신하려면 false 유지
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
      
      // 인물 추가 버튼 이벤트 (중복 방지)
      const characterAddBtn = document.getElementById('characterAddBtn');
      if (characterAddBtn && !characterAddBtn.hasAttribute('data-listener-added')) {
        characterAddBtn.addEventListener('click', () => {
          this.openCharacterAddModal();
        });
        characterAddBtn.setAttribute('data-listener-added', 'true');
      }
      
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
    // 기존 공용 모달을 여는 인물 추가 리스너는 제거 (새 인물 전용 모달 사용)

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
      // console.log('=== 대시보드 데이터 로드 시작 ===');
      const response = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include'
      });
      
      // console.log('API 응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        // console.log('받은 데이터:', data);
        
        // 안전하게 데이터 처리
        if (data.stats) {
          this.updateStats(data.stats);
        } else {
          // console.warn('stats 데이터가 없습니다:', data);
        }
        
        if (data.recentActivity) {
          this.updateRecentActivity(data.recentActivity);
        } else {
          // console.warn('recentActivity 데이터가 없습니다:', data);
        }
        
        // 차트 데이터 로드
        this.loadTrends();
        // SSE 구독 (옵션)
        if (ENABLE_LIVE_STATS) this.startLiveStream();
      } else {
        console.error('API 호출 실패:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
    }
  }

  // 트렌드 데이터 로드 및 차트 렌더링
  async loadTrends(days = 7) {
    try {
      console.log('=== 트렌드 데이터 로드 시작 ===');
      const res = await fetch(`/api/admin/dashboard/trends?days=${days}`, { credentials: 'include' });
      
      if (!res.ok) {
        console.error('트렌드 API 호출 실패:', res.status, res.statusText);
        return;
      }
      
      const data = await res.json();
      console.log('트렌드 데이터:', data);
      
      // 안전하게 데이터 검증
      if (!data.labels || !data.series) {
        console.warn('트렌드 데이터 구조가 올바르지 않습니다:', data);
        return;
      }
      
      const { labels, series } = data;
      
      // series 객체 안전성 검증
      if (!series.users || !series.comments) {
        console.warn('series 데이터가 올바르지 않습니다:', series);
        return;
      }
      
      const ctx = document.getElementById('trendChart');
      if (!ctx) {
        console.warn('trendChart 캔버스 요소를 찾을 수 없습니다');
        return;
      }
      
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
      
      console.log('트렌드 차트 생성 완료');
    } catch (e) {
      console.error('●▶ 트렌드 로드 오류:', e);
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
    console.log('통계 업데이트:', stats);
    
    // 안전하게 통계 업데이트
    const updateCount = (id, value) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value || 0;
      } else {
        console.warn(`요소를 찾을 수 없습니다: ${id}`);
      }
    };
    
    updateCount('userCount', stats?.users);
    updateCount('placeCount', stats?.places);
    updateCount('workCount', stats?.works);
    updateCount('characterCount', stats?.characters);
    updateCount('commentCount', stats?.comments);
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
              <button class="btn-action btn-view" onclick="dashboard.editPlace('${place._id}')">수정</button>
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
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-view" onclick="dashboard.editCharacter('${character._id}')">수정</button>
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
      
      // 키보드 네비게이션 설정
      this.setupWorkModalKeyboardNavigation();
      
      // 버튼 이벤트 설정
      this.setupWorkModalButtons(workId);
      
    } catch (error) {
      console.error('작품 수정 모달 열기 오류:', error);
      alert('작품 정보를 불러오는 중 오류가 발생했습니다.');
    }
  }

  // 작품 수정 모달 키보드 네비게이션 설정
  setupWorkModalKeyboardNavigation() {
    const typeSelect = document.getElementById('work-type');
    if (!typeSelect) return;
    
    // 드롭다운 키보드 네비게이션
    typeSelect.addEventListener('keydown', (e) => {
      const options = Array.from(typeSelect.options);
      const currentIndex = typeSelect.selectedIndex;
      
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < options.length - 1) {
            typeSelect.selectedIndex = currentIndex + 1;
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            typeSelect.selectedIndex = currentIndex - 1;
          }
          break;
        case 'Enter':
          e.preventDefault();
          typeSelect.blur(); // 포커스 해제
          break;
        case 'Escape':
          e.preventDefault();
          typeSelect.blur();
          break;
      }
    });
    
    // 모달 전체 키보드 네비게이션
    const modal = document.getElementById('workEditModal');
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeWorkEditModal();
      }
    });
  }

  // 작품 수정 모달 닫기
  closeWorkEditModal() {
    document.getElementById('workEditModal').style.display = 'none';
  }

  // 작품 수정 모달 버튼 이벤트 설정
  setupWorkModalButtons(workId) {
    // 저장 버튼
    const saveBtn = document.getElementById('work-save-btn');
    if (saveBtn) {
      saveBtn.onclick = () => this.saveWorkEdit(workId);
    }
    
    // 취소 버튼
    const cancelBtn = document.getElementById('work-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => this.closeWorkEditModal();
    }
    
    // 모달 닫기 버튼 (X)
    const closeBtn = document.querySelector('#workEditModal .modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeWorkEditModal();
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

  // 인물 추가 모달 열기
  async openCharacterAddModal() {
    try {
      // 작품 목록 가져오기(요약 API)
      const worksRes = await fetch('/api/admin/works/summary', { credentials: 'include' });
      if (!worksRes.ok) throw new Error('작품 목록을 불러올 수 없습니다.');
      const worksData = await worksRes.json();
      
      // 작품 드롭다운 채우기
      this.populateWorksDropdown(worksData.works);
      
      // 모달 표시
      document.getElementById('characterAddModal').style.display = 'flex';
      
      // 이벤트 설정
      this.setupCharacterAddModal();
      
    } catch (error) {
      console.error('인물 추가 모달 오류:', error);
      alert('작품 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }

  // 작품 드롭다운 채우기
  populateWorksDropdown(works, dropdownId = 'works-dropdown') {
    this.allWorks = works; // 작품 전체 목록을 보관
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = works.map(work => `
      <div class=\"work-option\" data-work-id=\"${work._id}\">
        <div class=\"work-title\">${work.title}</div>
        <div class=\"work-type\">${work.type || '타입 미지정'}</div>
      </div>
    `).join('');
  }

  // 인물 추가 모달 이벤트 설정
  setupCharacterAddModal() {
    const selectedWorks = document.getElementById('selected-works');
    const dropdown = document.getElementById('works-dropdown');
    let selectedWorkIds = [];
    const nameRow = document.getElementById('work-character-names-row');
    const nameList = document.getElementById('work-character-names');

    // 기존 이벤트 리스너 제거 (중복 방지)
    const newSelectedWorks = selectedWorks.cloneNode(true);
    selectedWorks.parentNode.replaceChild(newSelectedWorks, selectedWorks);
    
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    // 드롭다운 토글
    newSelectedWorks.addEventListener('click', () => {
      newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // 작품 선택 (중복 방지 강화)
    newDropdown.addEventListener('click', (e) => {
      const workOption = e.target.closest('.work-option');
      if (!workOption) return;

      const workId = workOption.dataset.workId;
      const workTitle = workOption.querySelector('.work-title').textContent;

      // 중복 체크 강화
      if (!selectedWorkIds.includes(workId)) {
        selectedWorkIds.push(workId);
        this.addSelectedWorkTag(workTitle, workId, selectedWorkIds);

        // 작품별 작중이름 입력칸 추가
        this.addWorkCharacterNameInput(workId, workTitle, nameRow, nameList);

        // 선택된 옵션에 시각적 표시
        workOption.classList.add('selected');

        // 드롭다운 닫기
        newDropdown.style.display = 'none';
      } else {
        console.log('이미 선택된 작품입니다:', workTitle);
      }
    });

    // 저장 버튼 (중복 방지)
    const saveBtn = document.getElementById('character-save-btn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        this.saveCharacter(selectedWorkIds);
      };
    }

    // 취소 버튼 (중복 방지)
    const cancelBtn = document.getElementById('character-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        this.closeCharacterAddModal();
      };
    }

    // 모달 닫기 버튼 (중복 방지)
    const closeBtn = document.querySelector('#characterAddModal .modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        this.closeCharacterAddModal();
      };
    }

    // 외부 클릭으로 드롭다운 닫기
    const clickHandler = (e) => {
      if (!e.target.closest('.multi-select-container')) {
        newDropdown.style.display = 'none';
      }
    };
    document.addEventListener('click', clickHandler);
    
    // 모달이 닫힐 때 이벤트 리스너 제거
    const modal = document.getElementById('characterAddModal');
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (modal.style.display === 'none') {
            document.removeEventListener('click', clickHandler);
            observer.disconnect();
          }
        }
      });
    });
    observer.observe(modal, { attributes: true });
  }

  // 선택된 작품 태그 추가
  addSelectedWorkTag(title, workId, selectedWorkIds) {
    const selectedWorks = document.getElementById('selected-works');
    const placeholder = selectedWorks.querySelector('.placeholder');
    
    if (placeholder) {
      placeholder.remove();
    }

    const tag = document.createElement('div');
    tag.className = 'selected-work-tag';
    tag.innerHTML = `
      ${title}
      <span class="remove" data-work-id="${workId}">&times;</span>
    `;

    // 제거 버튼 이벤트
    tag.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      const index = selectedWorkIds.indexOf(workId);
      if (index > -1) {
        selectedWorkIds.splice(index, 1);
      }
      tag.remove();

      // 해당 작품의 작중이름 입력칸도 제거
      this.removeWorkCharacterNameInput(workId);

      // 모든 태그가 제거되면 placeholder 다시 표시
      if (selectedWorkIds.length === 0) {
        selectedWorks.innerHTML = '<span class="placeholder">작품을 선택하세요</span>';
        // 작중이름 섹션도 숨기기
        const nameRow = document.getElementById('work-character-names-row');
        if (nameRow) nameRow.style.display = 'none';
      }
    });

    selectedWorks.appendChild(tag);
  }

  // 작품별 작중이름 입력칸 추가
  addWorkCharacterNameInput(workId, workTitle, nameRow, nameList) {
    if (nameRow.style.display === 'none') nameRow.style.display = 'block';
    const item = document.createElement('div');
    item.className = 'work-character-name-item';
    item.dataset.workId = workId;
    item.innerHTML = `
      <div class="work-title">${workTitle}</div>
      <input type="text" class="work-character-name-input" placeholder="작중이름 입력">
    `;
    nameList.appendChild(item);
  }

  // 작품별 작중이름 입력칸 제거
  removeWorkCharacterNameInput(workId) {
    const nameList = document.getElementById('work-character-names');
    if (nameList) {
      const item = nameList.querySelector(`[data-work-id="${workId}"]`);
      if (item) {
        item.remove();
      }
      
      // 모든 입력칸이 제거되면 섹션 숨기기
      if (nameList.children.length === 0) {
        const nameRow = document.getElementById('work-character-names-row');
        if (nameRow) nameRow.style.display = 'none';
      }
    }
  }

  // 인물 저장
  async saveCharacter(selectedWorkIds) {
    try {
      // 모든 필드 값 수집
      const name = document.getElementById('character-name').value.trim();
      const job = document.getElementById('character-job').value.trim();
      const nationality = document.getElementById('character-nationality').value.trim();
      const birthDate = document.getElementById('character-birthDate').value;
      const birthPlace = document.getElementById('character-birthPlace').value.trim();
      const education = document.getElementById('character-education').value.trim();
      const heightCm = document.getElementById('character-heightCm').value;
      const weightKg = document.getElementById('character-weightKg').value;
      const description = document.getElementById('character-description').value.trim();
      const image = document.getElementById('character-image').value.trim();
      const characterName = document.getElementById('character-characterName').value.trim();

      if (!name) {
        alert('인물명을 입력해주세요.');
        return;
      }

      // 작품별 작중이름 수집 (workId -> name)
      const perWorkNames = Array.from(document.querySelectorAll('.work-character-name-item'))
        .map(item => ({
          workId: item.dataset.workId,
          characterName: item.querySelector('.work-character-name-input').value.trim()
        }))
        .filter(x => x.characterName);

      const characterData = {
        name,
        job: job || undefined,
        nationality: nationality || undefined,
        birthDate: birthDate || undefined,
        birthPlace: birthPlace || undefined,
        education: education || undefined,
        heightCm: heightCm ? parseInt(heightCm) : undefined,
        weightKg: weightKg ? parseInt(weightKg) : undefined,
        description: description || undefined,
        image: image || undefined,
        characterName: characterName || undefined, // 단일 입력값(하위호환)
        workIds: selectedWorkIds, // 선택된 작품 ID들
        workCharacterNames: perWorkNames // 작품별 작중이름 목록
      };

      console.log('인물 데이터:', characterData);

      const response = await fetch('/api/admin/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(characterData)
      });

      if (response.ok) {
        alert('인물이 성공적으로 추가되었습니다.');
        this.closeCharacterAddModal();
        this.loadCharacters(); // 인물 목록 새로고침
      } else {
        const error = await response.json();
        console.error('인물 추가 실패:', error);
        alert(`인물 추가 실패: ${error.error.message}`);
      }
    } catch (error) {
      console.error('인물 저장 오류:', error);
      alert('인물 저장 중 오류가 발생했습니다.');
    }
  }

  // 인물 추가 모달 닫기
  closeCharacterAddModal() {
    const modal = document.getElementById('characterAddModal');
    if (modal) {
      modal.style.display = 'none';
      
      // 모든 폼 필드 초기화
      document.getElementById('character-name').value = '';
      document.getElementById('character-job').value = '';
      document.getElementById('character-nationality').value = '';
      document.getElementById('character-birthDate').value = '';
      document.getElementById('character-birthPlace').value = '';
      document.getElementById('character-education').value = '';
      document.getElementById('character-heightCm').value = '';
      document.getElementById('character-weightKg').value = '';
      document.getElementById('character-description').value = '';
      document.getElementById('character-image').value = '';
      document.getElementById('character-characterName').value = '';
      document.getElementById('selected-works').innerHTML = '<span class="placeholder">작품을 선택하세요</span>';
      // 작품별 작중이름 입력 목록 초기화
      const nameRow = document.getElementById('work-character-names-row');
      const nameList = document.getElementById('work-character-names');
      if (nameList) nameList.innerHTML = '';
      if (nameRow) nameRow.style.display = 'none';
      
      // 드롭다운 숨기기
      const dropdown = document.getElementById('works-dropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
    }
  }

  // 인물 수정 모달 열기
  async openCharacterEditModal(character) {
    try {
      // 작품 목록 가져오기(요약 API)
      const worksRes = await fetch('/api/admin/works/summary', { credentials: 'include' });
      if (!worksRes.ok) throw new Error('작품 목록을 불러올 수 없습니다.');
      const worksData = await worksRes.json();
      
      // 작품 드롭다운 채우기
      this.populateWorksDropdown(worksData.works, 'edit-works-dropdown');
      
      // 현재 인물 정보로 폼 채우기
      this.populateCharacterEditForm(character);
      
      // 선택된 작품 뱃지 스타일, 입력 필드 스타일 동일화 (추가 모달 기준)
      const selectedWrap = document.getElementById('edit-selected-works');
      selectedWrap.className = 'selected-works';
      const dropdown = document.getElementById('edit-works-dropdown');
      dropdown.className = 'works-dropdown';
      const namesWrap = document.getElementById('edit-work-character-names');
      if (namesWrap) namesWrap.classList.remove('edit-mode');
      
      // 모달 표시
      document.getElementById('characterEditModal').style.display = 'flex';
      
      // 이벤트 설정
      this.setupCharacterEditModal();
      
    } catch (error) {
      console.error('인물 수정 모달 오류:', error);
      alert('작품 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }

  // 인물 수정 폼에 데이터 채우기
  populateCharacterEditForm(character) {
    console.log('=== 인물 수정 폼 데이터 채우기 ===');
    console.log('전체 인물 정보:', character);
    console.log('workIds 타입:', typeof character.workIds, '값:', character.workIds);
    console.log('workCharacterNames 타입:', typeof character.workCharacterNames, '값:', character.workCharacterNames);
    
    document.getElementById('edit-character-name').value = character.name || '';
    document.getElementById('edit-character-job').value = character.job || '';
    document.getElementById('edit-character-nationality').value = character.nationality || '';
    document.getElementById('edit-character-birthDate').value = character.birthDate || '';
    document.getElementById('edit-character-birthPlace').value = character.birthPlace || '';
    document.getElementById('edit-character-education').value = character.education || '';
    document.getElementById('edit-character-heightCm').value = character.heightCm || '';
    document.getElementById('edit-character-weightKg').value = character.weightKg || '';
    document.getElementById('edit-character-description').value = character.description || '';
    document.getElementById('edit-character-image').value = character.image || '';
    
    // 관련 작품 설정
    console.log('workIds 존재 여부:', !!character.workIds);
    console.log('workIds 길이:', character.workIds ? character.workIds.length : 'undefined');
    
    if (character.workIds && character.workIds.length > 0) {
      console.log('>>> 관련 작품 설정 시작');
      console.log('관련 작품 IDs:', character.workIds);
      console.log('작중이름 매핑:', character.workCharacterNames);
      
      // 잠시 후에 실행 (드롭다운이 준비될 때까지 대기)
      setTimeout(() => {
        console.log('>>> setTimeout에서 setSelectedWorksForEdit 호출');
        this.setSelectedWorksForEdit(character.workIds, character.workCharacterNames || {});
      }, 100);
    } else {
      console.log('>>> 관련 작품이 없음');
    }
  }

  // 수정 모달용 작품 선택 설정
  setSelectedWorksForEdit(workIds, workCharacterNames = {}) {
    console.log('=== setSelectedWorksForEdit 시작 ===');
    console.log('받은 workIds:', workIds);
    console.log('받은 workCharacterNames:', workCharacterNames);
    
    const selectedWorks = document.getElementById('edit-selected-works');
    const nameRow = document.getElementById('edit-work-character-names-row');
    const nameList = document.getElementById('edit-work-character-names');
    
    console.log('DOM 요소들:', {
      selectedWorks: !!selectedWorks,
      nameRow: !!nameRow,
      nameList: !!nameList
    });
    
    if (!selectedWorks) {
      console.error('edit-selected-works 요소를 찾을 수 없습니다!');
      return;
    }
    
    // 기존 선택 초기화
    selectedWorks.innerHTML = '';
    if (nameList) nameList.innerHTML = '';
    if (nameRow) nameRow.style.display = 'none';
    
    // 선택된 작품들 표시
    console.log('작품 처리 시작, workIds 개수:', workIds.length);
    workIds.forEach((workId, index) => {
      console.log(`작품 ${index}: workId=${workId}`);
      const workOption = document.querySelector(`#edit-works-dropdown [data-work-id="${workId}"]`);
      console.log(`workOption 찾음:`, !!workOption);
      
      if (workOption) {
        // 작품 제목만 가져오기 (타입 제외)
        const workTitleElement = workOption.querySelector('.work-title');
        const workTitle = workTitleElement ? workTitleElement.textContent.trim() : workOption.textContent.trim();
        console.log(`작품 제목: ${workTitle}`);
        
        const characterName = workCharacterNames[workId];
        console.log(`작중이름: ${characterName}`);
        
        this.addSelectedWorkTagForEdit(workId, workTitle);
        this.addWorkCharacterNameInputForEdit(workId, workTitle, nameRow, nameList, characterName);
      } else {
        console.warn(`workId ${workId}에 해당하는 작품을 드롭다운에서 찾을 수 없습니다`);
      }
    });
    
    // 작품이 선택되었으면 작중이름 섹션 표시
    if (workIds.length > 0) {
      console.log('작중이름 섹션 표시');
      if (nameRow) nameRow.style.display = 'block';
    }
    
    // placeholder 제거
    const placeholder = selectedWorks.querySelector('.placeholder');
    if (placeholder) {
      console.log('placeholder 제거');
      placeholder.remove();
    }
    
    console.log('=== setSelectedWorksForEdit 완료 ===');
  }

  // 수정 모달용 작품 태그 추가 (추가 모달과 동일한 스타일)
  addSelectedWorkTagForEdit(workId, workTitle) {
    const selectedWorks = document.getElementById('edit-selected-works');
    const placeholder = selectedWorks.querySelector('.placeholder');
    
    if (placeholder) {
      placeholder.remove();
    }

    const tag = document.createElement('div');
    tag.className = 'selected-work-tag';
    // 저장 시 수집을 위해 필수: 선택된 태그 자체에 data-work-id 부여
    tag.setAttribute('data-work-id', workId);
    tag.innerHTML = `
      ${workTitle}
      <span class="remove" data-work-id="${workId}">&times;</span>
    `;
    
    // 제거 버튼 이벤트
    tag.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      tag.remove();
      this.removeWorkCharacterNameInputForEdit(workId);
      
      // 모든 태그가 제거되면 placeholder 다시 표시
      if (selectedWorks.children.length === 0) {
        selectedWorks.innerHTML = '<span class="placeholder">작품을 선택하세요</span>';
        const nameRow = document.getElementById('edit-work-character-names-row');
        if (nameRow) nameRow.style.display = 'none';
      }
    });
    
    selectedWorks.appendChild(tag);
  }

  // 수정 모달용 작중이름 입력칸 추가 (추가 모달과 동일한 스타일)
  addWorkCharacterNameInputForEdit(workId, workTitle, nameRow, nameList, characterName = '') {
    if (nameRow.style.display === 'none') nameRow.style.display = 'block';
    
    const item = document.createElement('div');
    item.className = 'work-character-name-item';
    item.dataset.workId = workId;
    item.innerHTML = `
      <div class="work-title">${workTitle}</div>
      <input type="text" class="work-character-name-input" placeholder="작중이름 입력" value="${characterName}">
    `;
    
    nameList.appendChild(item);
  }

  // 수정 모달용 작중이름 입력칸 제거 (추가 모달과 동일한 스타일)
  removeWorkCharacterNameInputForEdit(workId) {
    const nameList = document.getElementById('edit-work-character-names');
    if (nameList) {
      const item = nameList.querySelector(`[data-work-id="${workId}"]`);
      if (item) {
        item.remove();
      }
      
      // 모든 입력칸이 제거되면 섹션 숨기기
      if (nameList.children.length === 0) {
        const nameRow = document.getElementById('edit-work-character-names-row');
        if (nameRow) nameRow.style.display = 'none';
      }
    }
  }

  // 인물 수정 모달 이벤트 설정
  setupCharacterEditModal() {
    const selectedWorks = document.getElementById('edit-selected-works');
    const dropdown = document.getElementById('edit-works-dropdown');
    const nameRow = document.getElementById('edit-work-character-names-row');
    const nameList = document.getElementById('edit-work-character-names');
    let selectedWorkIds = [];
    
    // 기존 이벤트 리스너 제거 (중복 방지)
    const newSelectedWorks = selectedWorks.cloneNode(true);
    selectedWorks.parentNode.replaceChild(newSelectedWorks, selectedWorks);
    
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);
    
    // 드롭다운 토글
    newSelectedWorks.addEventListener('click', () => {
      newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    // 작품 선택 (중복 방지 강화)
    newDropdown.addEventListener('click', (e) => {
      const workOption = e.target.closest('.work-option');
      if (!workOption) return;

      const workId = workOption.dataset.workId;
      const workTitle = workOption.querySelector('.work-title').textContent;

      // 중복 체크 강화
      if (!selectedWorkIds.includes(workId)) {
        selectedWorkIds.push(workId);
        this.addSelectedWorkTagForEdit(workId, workTitle);

        // 작품별 작중이름 입력칸 추가
        this.addWorkCharacterNameInputForEdit(workId, workTitle, nameRow, nameList, '');

        // 선택된 옵션에 시각적 표시
        workOption.classList.add('selected');

        // 드롭다운 닫기
        newDropdown.style.display = 'none';
      } else {
        console.log('이미 선택된 작품입니다:', workTitle);
      }
    });
    
    // 저장 버튼 이벤트
    const saveBtn = document.getElementById('edit-character-save-btn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        this.saveCharacterEdit();
      };
    }
    
    // 취소 버튼 이벤트
    const cancelBtn = document.getElementById('edit-character-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        this.closeCharacterEditModal();
      };
    }
    
    // 모달 닫기 버튼 이벤트
    const closeBtn = document.querySelector('#characterEditModal .modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        this.closeCharacterEditModal();
      };
    }
    
    // 외부 클릭으로 드롭다운 닫기
    const clickHandler = (e) => {
      if (!e.target.closest('.multi-select-container')) {
        dropdown.style.display = 'none';
      }
    };
    document.addEventListener('click', clickHandler);
  }

  // 수정 모달에서 작품 선택 여부 확인 (추가 모달과 동일한 스타일)
  isWorkSelectedForEdit(workId) {
    const selectedWorks = document.getElementById('edit-selected-works');
    return selectedWorks.querySelector(`[data-work-id="${workId}"]`) !== null;
  }

  // 인물 수정 저장
  async saveCharacterEdit() {
    try {
      const characterId = this.currentEditingCharacterId;
      if (!characterId) {
        alert('수정할 인물 정보가 없습니다.');
        return;
      }
      
      // 폼 데이터 수집
      const characterData = {
        name: document.getElementById('edit-character-name').value,
        job: document.getElementById('edit-character-job').value,
        nationality: document.getElementById('edit-character-nationality').value,
        birthDate: document.getElementById('edit-character-birthDate').value,
        birthPlace: document.getElementById('edit-character-birthPlace').value,
        education: document.getElementById('edit-character-education').value,
        heightCm: parseInt(document.getElementById('edit-character-heightCm').value) || null,
        weightKg: parseInt(document.getElementById('edit-character-weightKg').value) || null,
        description: document.getElementById('edit-character-description').value,
        image: document.getElementById('edit-character-image').value
      };
      
      // 필수 필드 검증
      if (!characterData.name.trim()) {
        alert('인물명을 입력해주세요.');
        return;
      }
      
      // 선택된 작품들 수집 (수정된 클래스명 사용)
      const selectedWorkTags = document.querySelectorAll('#edit-selected-works .selected-work-tag');
      const workIds = [];
      const workCharacterNames = {};
      
      selectedWorkTags.forEach(tag => {
        const workId = tag.getAttribute('data-work-id');
        if (workId) {
          workIds.push(workId);
          
          // 해당 작품의 작중이름 입력값 수집
          const nameInput = document.querySelector(`#edit-work-character-names [data-work-id="${workId}"] input`);
          if (nameInput && nameInput.value.trim()) {
            workCharacterNames[workId] = nameInput.value.trim();
          }
        }
      });
      
      characterData.workIds = workIds;
      characterData.workCharacterNames = workCharacterNames;
      
      // 디버깅: 수집된 데이터 확인
      console.log('=== 인물 수정 데이터 수집 ===');
      console.log('characterId:', characterId);
      console.log('workIds:', workIds);
      console.log('workCharacterNames:', workCharacterNames);
      console.log('전체 characterData:', characterData);
      
      // 서버에 수정 요청
      const response = await fetch(`/api/admin/characters/${characterId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(characterData)
      });

      if (response.ok) {
        alert('인물이 성공적으로 수정되었습니다.');
        this.closeCharacterEditModal();
        this.loadCharacters(); // 인물 목록 새로고침
      } else {
        const error = await response.json();
        console.error('인물 수정 실패:', error);
        alert(`인물 수정 실패: ${error.error.message}`);
      }
    } catch (error) {
      console.error('인물 수정 오류:', error);
      alert('인물 수정 중 오류가 발생했습니다.');
    }
  }

  // 인물 수정 모달 닫기
  closeCharacterEditModal() {
    const modal = document.getElementById('characterEditModal');
    if (modal) {
      modal.style.display = 'none';
      
      // 모든 폼 필드 초기화
      document.getElementById('edit-character-name').value = '';
      document.getElementById('edit-character-job').value = '';
      document.getElementById('edit-character-nationality').value = '';
      document.getElementById('edit-character-birthDate').value = '';
      document.getElementById('edit-character-birthPlace').value = '';
      document.getElementById('edit-character-education').value = '';
      document.getElementById('edit-character-heightCm').value = '';
      document.getElementById('edit-character-weightKg').value = '';
      document.getElementById('edit-character-description').value = '';
      document.getElementById('edit-character-image').value = '';
      document.getElementById('edit-selected-works').innerHTML = '<span class="placeholder">작품을 선택하세요</span>';
      
      // 작품별 작중이름 입력 목록 초기화
      const nameRow = document.getElementById('edit-work-character-names-row');
      const nameList = document.getElementById('edit-work-character-names');
      if (nameList) nameList.innerHTML = '';
      if (nameRow) nameRow.style.display = 'none';
      
      // 드롭다운 숨기기
      const dropdown = document.getElementById('edit-works-dropdown');
      if (dropdown) {
        dropdown.style.display = 'none';
      }
      
      // 현재 편집 중인 인물 ID 초기화
      this.currentEditingCharacterId = null;
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
      
      // 필수 필드 검증
      if (!title.trim()) {
        alert('작품 제목을 입력해주세요.');
        return;
      }
      
      if (!type) {
        alert('작품 타입을 선택해주세요.');
        return;
      }
      
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
  
  async editCharacter(characterId) {
    try {
      // 현재 편집 중인 인물 ID 저장
      this.currentEditingCharacterId = characterId;
      
      // 인물 정보 가져오기
      const response = await fetch(`/api/admin/characters/${characterId}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('인물 정보를 가져올 수 없습니다.');
      }
      
      const data = await response.json();
      const character = data && data.character ? data.character : data;
      this.openCharacterEditModal(character);
    } catch (error) {
      console.error('인물 정보 로드 오류:', error);
      alert('인물 정보를 불러오는데 실패했습니다.');
    }
  }
}

// 전역 변수로 대시보드 인스턴스 생성
let dashboard;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new AdminDashboard();
});
