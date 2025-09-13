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
    const rows = [[ '실제명', '가명' ], ...data.places.map(p => [p.real_name || '', p.fictional_name || ''])];
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
  async openPlaceModal(place = null, allWorks = null, selectedWorkIds = []) {
    // 필요시 전체 작품 목록 조회
    if (!allWorks) {
      const worksRes = await fetch('/api/admin/works?page=1&limit=1000', { credentials: 'include' });
      const worksData = worksRes.ok ? await worksRes.json() : { works: [] };
      allWorks = worksData.works || [];
    }

    const body = document.getElementById('modalBody');
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = place ? '장소 수정' : '장소 추가';
    const safe = (v) => (v || '').toString().replaceAll('"', '&quot;');

    const worksOptions = allWorks.map(w => {
      const checked = selectedWorkIds.includes(String(w._id)) ? 'checked' : '';
      const checkboxId = `w-check-${w._id}`;
      return `
        <div class="work-option-row">
          <input type="checkbox" class="w-check" id="${checkboxId}" value="${w._id}" ${checked}>
          <label for="${checkboxId}" class="work-title-text">${safe(w.title)}</label>
        </div>
      `;
    }).join('') || '<div class="form-help">등록된 작품이 없습니다.</div>';

    body.innerHTML = `
      <div class="form-row"><label>실제명</label><input id="f-real" value="${safe(place?.real_name)}" placeholder="실제 장소명"></div>
      <div class="form-row"><label>가명</label><input id="f-fic" value="${safe(place?.fictional_name)}" placeholder="작품 속 장소명"></div>
      <div class="form-row"><label>주소</label><input id="f-addr" value="${safe(place?.address)}" placeholder="도로명 주소"></div>
      <div class="form-row image-input-row">
        <label>이미지</label>
        <div class="image-input-toggle">
          <label><input type="radio" name="imgMode" value="path" checked> 이미지 경로 입력</label>
          <label><input type="radio" name="imgMode" value="upload"> 이미지 직접 업로드</label>
        </div>
        <div class="image-path-input">
          <input id="f-image" value="${safe(place?.image)}" placeholder="/images/places/sample.jpg">
        </div>
        <div class="image-upload-controls" id="place-upload-controls">
          <input type="file" id="place-image-file" accept="image/*" style="display:none;" />
          <button id="place-image-choose" class="btn-secondary">파일 선택</button>
          <div class="image-upload-preview" id="place-image-preview" title="미리보기"></div>
        </div>
      </div>
      <div class="form-row"><label>지도 URL</label><input id="f-map" value="${safe(place?.mapUrl)}" placeholder="https://maps.google.com/..." ></div>
      <div class="form-row"><label>연결 작품</label>
        <div class="search-container"><input type="text" id="w-search" class="search-input" placeholder="작품명 검색"></div>
        <div id="works-list" class="works-select-box">${worksOptions}</div>
        <small class="form-help">체크한 작품과 이 장소를 연결합니다.</small>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
        <button id="modalSave" class="btn-primary">저장</button>
        <button id="modalCancel" class="btn-secondary">취소</button>
      </div>
    `;

    // 검색 필터링
    const listEl = document.getElementById('works-list');
    const searchEl = document.getElementById('w-search');
    if (searchEl) {
      searchEl.addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        listEl.querySelectorAll('.work-option-row').forEach(row => {
          const title = row.querySelector('.work-title-text')?.textContent?.toLowerCase() || '';
          row.style.display = title.includes(q) ? '' : 'none';
        });
      });
    }

    // 선택 상태 시각화
    listEl.querySelectorAll('.w-check').forEach(chk => {
      const row = chk.closest('.work-option-row');
      const setSel = () => row.classList.toggle('selected', chk.checked);
      setSel();
      chk.addEventListener('change', setSel);
      // 행 전체 클릭으로 토글
      row.addEventListener('click', (e) => {
        if (e.target.tagName !== 'INPUT') { // input 직접 클릭이 아닐 때만
          chk.checked = !chk.checked;
          setSel();
        }
      });
    });

    // 이미지 모드 토글
    const radioPath = body.querySelector('input[name="imgMode"][value="path"]');
    const radioUpload = body.querySelector('input[name="imgMode"][value="upload"]');
    const pathRow = body.querySelector('.image-path-input');
    const uploadRow = body.querySelector('#place-upload-controls');
    function syncImgMode() {
      const isUpload = radioUpload.checked;
      uploadRow.classList.toggle('show', isUpload);
      pathRow.style.display = isUpload ? 'none' : 'block';
    }
    radioPath.addEventListener('change', syncImgMode);
    radioUpload.addEventListener('change', syncImgMode);
    syncImgMode(); // 초기 상태 설정

    // 파일 선택 및 크롭
    const chooseBtn = body.querySelector('#place-image-choose');
    const fileInput = body.querySelector('#place-image-file');
    const preview = body.querySelector('#place-image-preview');
    let cropper = null;
    if (chooseBtn) chooseBtn.onclick = (e) => { e.preventDefault(); if (fileInput) fileInput.click(); };
    if (fileInput) fileInput.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const modal = document.getElementById('img-cropper-modal');
        const img = document.getElementById('img-cropper-image');
        img.src = ev.target.result;
        modal.style.display = 'flex';
        if (cropper) { cropper.destroy(); cropper = null; }
        cropper = new Cropper(img, { aspectRatio: 16/9, viewMode:1, autoCropArea:1 });
      };
      reader.readAsDataURL(file);
    };

    // 크롭 모달 컨트롤
    const closeCrop = () => { const m = document.getElementById('img-cropper-modal'); m.style.display = 'none'; if (cropper) { cropper.destroy(); cropper=null; } };
    document.getElementById('img-cropper-close').onclick = closeCrop;
    document.getElementById('img-cropper-cancel').onclick = closeCrop;
    const okBtnPlace = document.getElementById('img-cropper-ok');
    okBtnPlace.onclick = null; // 중복 핸들러 제거
    okBtnPlace.onclick = async () => {
      if (!cropper) return;
      cropper.getCroppedCanvas().toBlob(async (blob) => {
        // 업로드 → 서버 경로 반환 → 프리뷰/입력 반영
        const form = new FormData();
        form.append('image', blob, 'place.jpg');
        let res;
        if (place?._id) {
          res = await fetch(`/api/admin/places/${place._id}/image`, { method:'POST', credentials:'include', body: form });
        } else {
          // 추가 모드: 임시 업로드로 경로 확보
          res = await fetch(`/api/admin/uploads/places`, { method:'POST', credentials:'include', body: form });
        }
        if (res.ok) {
          const data = await res.json();
          document.getElementById('f-image').value = data.path; // 경로 반영
          preview.style.backgroundImage = `url('${data.path}?v=${Date.now()}')`;
          closeCrop();
        } else {
          alert('이미지 업로드 실패');
        }
      }, 'image/jpeg', 0.9);
    };

    document.getElementById('modalCancel').onclick = () => this.closeModal();
    document.getElementById('modalSave').onclick = async () => {
      const payload = {
        real_name: document.getElementById('f-real').value.trim(),
        fictional_name: document.getElementById('f-fic').value.trim(),
        address: document.getElementById('f-addr').value.trim(),
        image: document.getElementById('f-image').value.trim(),
        mapUrl: document.getElementById('f-map').value.trim(),
        workIds: Array.from(document.querySelectorAll('#works-list .w-check:checked')).map(el => el.value)
      };
      if (!payload.real_name || !payload.address) {
        alert('실제명과 주소는 필수입니다.');
        return;
      }
      const url = place ? `/api/admin/places/${place._id}` : '/api/admin/places';
      const method = place ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      if (res.ok) { this.closeModal(); this.loadPlaces(); }
      else {
        const err = await res.json().catch(()=>({}));
        alert(err.error?.message || '저장 실패');
      }
    };
  }

  async openWorkModal(work = null) {
    const body = document.getElementById('modalBody');
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = work ? '작품 수정' : '작품 추가';
    
    // 인물과 장소 데이터 가져오기
    const [charactersRes, placesRes] = await Promise.all([
      fetch('/api/admin/characters?page=1&limit=1000', { credentials: 'include' }),
      fetch('/api/admin/places?page=1&limit=1000', { credentials: 'include' })
    ]);
    
    const charactersData = charactersRes.ok ? await charactersRes.json() : { characters: [] };
    const placesData = placesRes.ok ? await placesRes.json() : { places: [] };
    
    body.innerHTML = `
      <div class="form-row">
        <label>제목</label>
        <input type="text" id="w-title" value="${work?.title || ''}">
      </div>
      <div class="form-row">
        <label>타입</label>
        <select id="w-type">
          <option value="">타입을 선택하세요</option>
          <option value="드라마" ${work?.type === '드라마' ? 'selected' : ''}>드라마</option>
          <option value="영화" ${work?.type === '영화' ? 'selected' : ''}>영화</option>
          <option value="앨범" ${work?.type === '앨범' ? 'selected' : ''}>앨범</option>
          <option value="MV" ${work?.type === 'MV' ? 'selected' : ''}>MV</option>
        </select>
      </div>
      <div class="form-row">
        <label>공개일</label>
        <div class="date-input-container">
          <input type="text" id="w-releaseDate" class="date-input" value="${work?.releaseDate || ''}" placeholder="YYYY-MM-DD 또는 클릭하여 선택">
          <i class="fas fa-calendar-alt date-picker-icon" id="w-date-picker-icon"></i>
          <div class="date-picker-popup" id="w-date-picker-popup">
            <!-- 달력이 여기에 동적으로 생성됩니다 -->
          </div>
        </div>
      </div>
      <div class="form-row">
        <label>설명</label>
        <textarea id="w-description" rows="3">${work?.description || ''}</textarea>
      </div>
      <div class="form-row image-input-row">
        <label>포스터 이미지</label>
        <div class="image-input-toggle">
          <label><input type="radio" name="wImgMode" value="path" checked> 이미지 경로 입력</label>
          <label><input type="radio" name="wImgMode" value="upload"> 이미지 직접 업로드</label>
        </div>
        <div class="image-path-input">
          <input type="text" id="w-image" value="${work?.image || ''}" placeholder="/images/works/sample.jpg">
        </div>
        <div class="image-upload-controls" id="work-upload-controls">
          <input type="file" id="work-image-file" accept="image/*" style="display:none;" />
          <button id="work-image-choose" class="btn-secondary">파일 선택</button>
          <div class="image-upload-preview" id="work-image-preview"></div>
        </div>
      </div>
      <div class="form-row">
        <label>등장인물</label>
        <div class="integrated-character-container">
          <div class="character-cards" id="w-character-cards">
            <div class="empty-state">
              <span class="placeholder">인물을 선택하세요</span>
            </div>
          </div>
          <div class="characters-dropdown" id="w-characters-dropdown" style="display: none;">
            <!-- 인물 목록이 여기에 동적으로 추가됩니다 -->
          </div>
          <button type="button" id="w-add-character-btn" class="btn-add-item">
            <i class="fas fa-plus"></i> 인물 추가
          </button>
        </div>
      </div>
      <div class="form-row">
        <label>촬영 장소</label>
        <div class="multi-select-container">
          <div class="selected-places" id="w-selected-places">
            <span class="placeholder">장소를 선택하세요</span>
          </div>
          <div class="places-dropdown" id="w-places-dropdown" style="display: none;">
            <!-- 장소 목록이 여기에 동적으로 추가됩니다 -->
          </div>
          <button type="button" id="w-add-place-btn" class="btn-add-item">
            <i class="fas fa-plus"></i> 장소 추가
          </button>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
        <button id="modalSave" class="btn-primary">저장</button>
        <button id="modalCancel" class="btn-secondary">취소</button>
      </div>
    `;
    
    // 기존 데이터가 있으면 표시 (수정 모드)
    if (work) {
      this.populateWorkAddModalExistingData(work, charactersData.characters, placesData.places);
    }
    
    // 인물/장소 선택 기능 설정
    this.setupWorkAddModalCharacterSelection(charactersData.characters);
    this.setupWorkAddModalPlaceSelection(placesData.places);
    
    // 날짜 선택기 설정
    this.setupDatePicker('w-releaseDate', 'w-date-picker-icon', 'w-date-picker-popup');
    
    // 이미지 모드 토글 (작품 2:3)
    const wrPath = body.querySelector('input[name="wImgMode"][value="path"]');
    const wrUpload = body.querySelector('input[name="wImgMode"][value="upload"]');
    const wPathRow = body.querySelector('.image-path-input');
    const wUploadRow = body.querySelector('#work-upload-controls');
    function syncWMode(){ 
      const isU = wrUpload.checked; 
      wUploadRow.classList.toggle('show', isU); 
      wPathRow.style.display = isU ? 'none' : 'block'; 
    }
    wrPath.addEventListener('change', syncWMode); 
    wrUpload.addEventListener('change', syncWMode); 
    syncWMode(); // 초기 상태 설정

    let wCropper = null;
    body.querySelector('#work-image-choose').addEventListener('click', (e)=>{ e.preventDefault(); body.querySelector('#work-image-file').click(); });
    body.querySelector('#work-image-file').addEventListener('change', (e)=>{
      const f = e.target.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = (ev)=>{
        const m = document.getElementById('img-cropper-modal');
        const img = document.getElementById('img-cropper-image');
        img.src = ev.target.result; m.style.display='flex';
        if (wCropper) { wCropper.destroy(); wCropper=null; }
        wCropper = new Cropper(img, { aspectRatio: 2/3, viewMode:1, autoCropArea:1 });
      };
      r.readAsDataURL(f);
    });
    const closeCropW = ()=>{ const m=document.getElementById('img-cropper-modal'); m.style.display='none'; if(wCropper){ wCropper.destroy(); wCropper=null; } };
    document.getElementById('img-cropper-close').onclick = closeCropW;
    document.getElementById('img-cropper-cancel').onclick = closeCropW;
    document.getElementById('img-cropper-ok').onclick = async ()=>{
      if (wCropper){
        wCropper.getCroppedCanvas().toBlob(async (blob)=>{
          const form=new FormData(); form.append('image', blob, 'work.jpg');
          let res;
          if (work?._id) {
            res = await fetch(`/api/admin/works/${work._id}/image`, { method:'POST', credentials:'include', body:form });
          } else {
            res = await fetch(`/api/admin/uploads/works`, { method:'POST', credentials:'include', body:form });
          }
          if (res.ok){ const d=await res.json(); document.getElementById('w-image').value = d.path; body.querySelector('#work-image-preview').style.backgroundImage = `url('${d.path}?v=${Date.now()}')`; closeCropW(); }
          else alert('이미지 업로드 실패');
        }, 'image/jpeg', 0.9);
      }
    };

    // 이벤트 리스너 설정
    document.getElementById('modalSave').onclick = async () => {
      await this.saveWorkAddModal(work);
    };
    
    document.getElementById('modalCancel').onclick = () => {
      this.closeModal();
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
      <div class="form-row image-input-row">
        <label>프로필 이미지</label>
        <div class="image-input-toggle">
          <label><input type="radio" name="cImgMode" value="path" checked> 이미지 경로 입력</label>
          <label><input type="radio" name="cImgMode" value="upload"> 이미지 직접 업로드</label>
        </div>
        <div class="image-path-input">
          <input type="text" id="c-image" value="${character?.image || ''}" placeholder="/images/characters/sample.jpg">
        </div>
        <div class="image-upload-controls" id="char-upload-controls">
          <input type="file" id="char-image-file" accept="image/*" style="display:none;" />
          <button id="char-image-choose" class="btn-secondary">파일 선택</button>
          <div class="image-upload-preview" id="char-image-preview"></div>
        </div>
      </div>
      <div style="margin-top:12px; display:flex; gap:8px; justify-content:flex-end;">
        <button id="modalSave" class="btn-primary">저장</button>
      </div>
    `;

    // 이미지 모드 토글 (인물 4:5)
    const crPath = body.querySelector('input[name="cImgMode"][value="path"]');
    const crUpload = body.querySelector('input[name="cImgMode"][value="upload"]');
    const cPathRow = body.querySelector('.image-path-input');
    const cUploadRow = body.querySelector('#char-upload-controls');
    function syncCMode(){ 
      const isU = crUpload.checked; 
      cUploadRow.classList.toggle('show', isU); 
      cPathRow.style.display = isU ? 'none' : 'block'; 
    }
    crPath.addEventListener('change', syncCMode); 
    crUpload.addEventListener('change', syncCMode); 
    syncCMode(); // 초기 상태 설정

    let cCropper = null;
    body.querySelector('#char-image-choose').addEventListener('click', (e)=>{ e.preventDefault(); body.querySelector('#char-image-file').click(); });
    body.querySelector('#char-image-file').addEventListener('change', (e)=>{
      const f = e.target.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = (ev)=>{
        const m = document.getElementById('img-cropper-modal');
        const img = document.getElementById('img-cropper-image');
        img.src = ev.target.result; m.style.display='flex';
        if (cCropper) { cCropper.destroy(); cCropper=null; }
        cCropper = new Cropper(img, { aspectRatio: 4/5, viewMode:1, autoCropArea:1 });
      };
      r.readAsDataURL(f);
    });
    const closeCropC = ()=>{ const m=document.getElementById('img-cropper-modal'); m.style.display='none'; if(cCropper){ cCropper.destroy(); cCropper=null; } };
    document.getElementById('img-cropper-close').onclick = closeCropC;
    document.getElementById('img-cropper-cancel').onclick = closeCropC;
    document.getElementById('img-cropper-ok').onclick = async ()=>{
      if (cCropper){
        cCropper.getCroppedCanvas().toBlob(async (blob)=>{
          const form=new FormData(); form.append('image', blob, 'character.jpg');
          let res;
          if (character?._id) {
            res = await fetch(`/api/admin/characters/${character._id}/image`, { method:'POST', credentials:'include', body:form });
          } else {
            res = await fetch(`/api/admin/uploads/characters`, { method:'POST', credentials:'include', body:form });
          }
          if (res.ok){ const d=await res.json(); document.getElementById('c-image').value = d.path; body.querySelector('#char-image-preview').style.backgroundImage = `url('${d.path}?v=${Date.now()}')`; closeCropC(); }
          else alert('이미지 업로드 실패');
        }, 'image/jpeg', 0.9);
      }
    };

    document.getElementById('modalSave').onclick = async () => {
      const payload = { name: document.getElementById('c-name').value, job: document.getElementById('c-job').value, description: document.getElementById('c-desc').value, image: (document.getElementById('c-image')?.value || '').trim() };
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
      const displayName = place.real_name || place.fictional_name || '이름 없음';
      const displayAddress = place.address || '주소 없음';
      const created = place.createdAt ? new Date(place.createdAt).toLocaleDateString() : '';
      return `
        <tr>
          <td>${displayName}</td>
          <td>${displayAddress}</td>
          <td>${created}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-action btn-view" onclick="dashboard.openPlaceEditModal('${place._id}')">수정</button>
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
  
  // 인물 목록 테이블 렌더링
  renderCharactersTable(characters) {
    const tbody = document.getElementById('charactersTableBody');
    tbody.innerHTML = characters.map(character => `
      <tr>
        <td>${character.name}</td>
        <td>
          <div class="action-buttons">
            <button class="btn-action btn-view" onclick="dashboard.editCharacter('${character._id}')">수정</button>
            <button class="btn-action btn-delete" onclick="dashboard.deleteCharacter('${character._id}', '${character.name}')">삭제</button>
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
      
      // 인물/장소 선택 기능 설정 (기존 데이터 표시 후)
      this.setupWorkCharacterSelection(charactersData.characters);
      this.setupWorkPlaceSelection(placesData.places);
      
      // 날짜 선택기 설정
      this.setupDatePicker('work-releaseDate', 'work-date-picker-icon', 'work-date-picker-popup');
      
      // 이미지 업로드 토글/이벤트 연결 (작품 수정: 2:3)
      (function setupWorkEditImageUI(){
        const body = document.getElementById('workEditModal');
        const rPath = body.querySelector('input[name="workEditImgMode"][value="path"]');
        const rUpload = body.querySelector('input[name="workEditImgMode"][value="upload"]');
        const pathRow = body.querySelector('#work-image')?.closest('.image-path-input') || body.querySelector('.image-path-input');
        const uploadRow = body.querySelector('#work-edit-upload-controls');
        const fileBtn = body.querySelector('#work-edit-image-choose');
        const fileInput = body.querySelector('#work-edit-image-file');
        const preview = body.querySelector('#work-edit-image-preview');
        const sync = ()=>{ const isU = rUpload && rUpload.checked; if(uploadRow) uploadRow.classList.toggle('show', !!isU); if(pathRow) pathRow.style.display = isU ? 'none' : 'block'; };
        rPath && rPath.addEventListener('change', sync);
        rUpload && rUpload.addEventListener('change', sync);
        sync();

        let cropper = null;
        if (fileBtn) fileBtn.onclick = (e)=>{ e.preventDefault(); if (fileInput) fileInput.click(); };
        if (fileInput) fileInput.onchange = (e)=>{
          const f = e.target.files[0]; if(!f) return;
          const r = new FileReader();
          r.onload = (ev)=>{
            const modal = document.getElementById('img-cropper-modal');
            const img = document.getElementById('img-cropper-image');
            img.src = ev.target.result; modal.style.display='flex';
            if (cropper) { cropper.destroy(); cropper=null; }
            cropper = new Cropper(img, { aspectRatio: 2/3, viewMode:1, autoCropArea:1 });
          };
          r.readAsDataURL(f);
        };
        const close = ()=>{ const m=document.getElementById('img-cropper-modal'); m.style.display='none'; if(cropper){ cropper.destroy(); cropper=null; } };
        document.getElementById('img-cropper-close').onclick = close;
        document.getElementById('img-cropper-cancel').onclick = close;
        const okBtn = document.getElementById('img-cropper-ok');
        okBtn.onclick = null; // 중복 바인딩 방지
        okBtn.onclick = async ()=>{
          if (!cropper) return;
          cropper.getCroppedCanvas().toBlob(async (blob)=>{
            const form = new FormData(); form.append('image', blob, 'work.jpg');
            let res;
            if (work && work._id) res = await fetch(`/api/admin/works/${work._id}/image`, { method:'POST', credentials:'include', body:form });
            else res = await fetch(`/api/admin/uploads/works`, { method:'POST', credentials:'include', body:form });
            if (res.ok){ const d = await res.json(); const input = document.getElementById('work-image'); if (input) input.value = d.path; if (preview) preview.style.backgroundImage = `url('${d.path}?v=${Date.now()}')`; close(); }
            else alert('이미지 업로드 실패');
          }, 'image/jpeg', 0.9);
        };
      })();

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

    // 기존 인물/장소 데이터를 새로운 UI에 표시
    this.populateWorkEditExistingData(work, allCharacters, allPlaces);

    // 저장 버튼 이벤트 리스너
    document.getElementById('work-save-btn').onclick = () => this.saveWorkEdit(work._id);
    
    // 취소 버튼 이벤트 리스너
    document.getElementById('work-cancel-btn').onclick = () => this.closeWorkEditModal();
  }

  // 편집 가능한 리스트 채우기
  populateEditableList(containerId, items, fieldType) {
    const container = document.getElementById(containerId);
    
    // 요소가 존재하지 않으면 함수 종료
    if (!container) {
      console.warn(`요소를 찾을 수 없습니다: ${containerId}`);
      return;
    }
    
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
      
      // 이미지 업로드 토글/이벤트 연결 (인물 추가: 4:5)
      (function setupCharAddImageUI(){
        const body = document.getElementById('characterAddModal');
        const rPath = body.querySelector('input[name="charAddImgMode"][value="path"]');
        const rUpload = body.querySelector('input[name="charAddImgMode"][value="upload"]');
        const pathRow = body.querySelector('#character-image')?.closest('.image-path-input') || body.querySelector('.image-path-input');
        const uploadRow = body.querySelector('#char-add-upload-controls');
        const fileBtn = body.querySelector('#char-add-image-choose');
        const fileInput = body.querySelector('#char-add-image-file');
        const preview = body.querySelector('#char-add-image-preview');
        const sync = ()=>{ const isU = rUpload && rUpload.checked; if(uploadRow) uploadRow.classList.toggle('show', !!isU); if(pathRow) pathRow.style.display = isU ? 'none' : 'block'; };
        rPath && rPath.addEventListener('change', sync);
        rUpload && rUpload.addEventListener('change', sync);
        sync();

        let cropper = null;
        fileBtn && fileBtn.addEventListener('click', (e)=>{ e.preventDefault(); fileInput && fileInput.click(); });
        fileInput && fileInput.addEventListener('change', (e)=>{
          const f = e.target.files[0]; if(!f) return;
          const r = new FileReader();
          r.onload = (ev)=>{
            const modal = document.getElementById('img-cropper-modal');
            const img = document.getElementById('img-cropper-image');
            img.src = ev.target.result; modal.style.display='flex';
            if (cropper) { cropper.destroy(); cropper=null; }
            cropper = new Cropper(img, { aspectRatio: 4/5, viewMode:1, autoCropArea:1 });
          };
          r.readAsDataURL(f);
        });
        const close = ()=>{ const m=document.getElementById('img-cropper-modal'); m.style.display='none'; if(cropper){ cropper.destroy(); cropper=null; } };
        document.getElementById('img-cropper-close').onclick = close;
        document.getElementById('img-cropper-cancel').onclick = close;
        document.getElementById('img-cropper-ok').onclick = async ()=>{
          if (!cropper) return;
          cropper.getCroppedCanvas().toBlob(async (blob)=>{
            const form = new FormData(); form.append('image', blob, 'character.jpg');
            const res = await fetch(`/api/admin/uploads/characters`, { method:'POST', credentials:'include', body:form });
            if (res.ok){ const d = await res.json(); const input = document.getElementById('character-image'); if (input) input.value = d.path; if (preview) preview.style.backgroundImage = `url('${d.path}?v=${Date.now()}')`; close(); }
            else alert('이미지 업로드 실패');
          }, 'image/jpeg', 0.9);
        };
      })();

      // 모달 표시
      document.getElementById('characterAddModal').style.display = 'flex';
      
      // 이벤트 설정
      this.setupCharacterAddModal();
      
    } catch (error) {
      console.error('인물 추가 모달 오류:', error);
      alert('작품 목록을 불러오는 중 오류가 발생했습니다.');
    }
  }

  // 작품 드롭다운 채우기 (검색 포함 - FiLo 스타일)
  populateWorksDropdown(works, dropdownId = 'works-dropdown') {
    this.allWorks = works; // 작품 전체 목록을 보관
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    dropdown.innerHTML = `
      <div class=\"search-container\">
        <input type=\"text\" class=\"search-input\" placeholder=\"작품 검색...\" />
      </div>
      <div class=\"options\">
        ${works.map(work => `
          <div class=\"work-option\" data-work-id=\"${work._id}\">
            <div class=\"work-title\">${work.title}</div>
            <div class=\"work-type\">${work.type || '타입 미지정'}</div>
          </div>
        `).join('')}
      </div>
    `;
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

    // 검색 필터링
    const searchInput = newDropdown.querySelector('.search-input');
    const optionsContainer = newDropdown.querySelector('.options');
    if (searchInput && optionsContainer) {
      searchInput.oninput = () => {
        const q = searchInput.value.trim().toLowerCase();
        optionsContainer.querySelectorAll('.work-option').forEach(opt => {
          const title = opt.querySelector('.work-title')?.textContent?.toLowerCase() || '';
          const typeText = opt.querySelector('.work-type')?.textContent?.toLowerCase() || '';
          opt.style.display = (title.includes(q) || typeText.includes(q)) ? '' : 'none';
        });
      };
    }

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
      // character-characterName 필드는 존재하지 않으므로 제거

      if (!name) {
        alert('인물명을 입력해주세요.');
        return;
      }

      // 작품별 작중이름 수집 (workId -> name) — 추가 모달 스코프로 한정
      const perWorkNames = Array.from(document.querySelectorAll('#work-character-names .work-character-name-item'))
        .map(item => ({
          workId: item.dataset.workId,
          characterName: item.querySelector('.work-character-name-input').value.trim()
        }))
        .filter(x => x.characterName);

      // 백엔드 호환을 위해 객체 매핑도 생성
      const workCharacterNamesMap = {};
      perWorkNames.forEach(({ workId, characterName }) => {
        workCharacterNamesMap[workId] = characterName;
      });

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
        // characterName 필드 제거 (존재하지 않는 필드)
        workIds: selectedWorkIds, // 선택된 작품 ID들
        workCharacterNames: workCharacterNamesMap // 작품별 작중이름 (workId -> name)
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
      
      // 이미지 업로드 토글/이벤트 연결 (인물 수정: 4:5)
      (function setupCharEditImageUI(){
        const body = document.getElementById('characterEditModal');
        const rPath = body.querySelector('input[name="charEditImgMode"][value="path"]');
        const rUpload = body.querySelector('input[name="charEditImgMode"][value="upload"]');
        const pathRow = body.querySelector('#edit-character-image')?.closest('.image-path-input') || body.querySelector('.image-path-input');
        const uploadRow = body.querySelector('#char-edit-upload-controls');
        const fileBtn = body.querySelector('#char-edit-image-choose');
        const fileInput = body.querySelector('#char-edit-image-file');
        const preview = body.querySelector('#char-edit-image-preview');
        const sync = ()=>{ const isU = rUpload && rUpload.checked; if(uploadRow) uploadRow.classList.toggle('show', !!isU); if(pathRow) pathRow.style.display = isU ? 'none' : 'block'; };
        rPath && rPath.addEventListener('change', sync);
        rUpload && rUpload.addEventListener('change', sync);
        sync();

        let cropper = null;
        if (fileBtn) fileBtn.onclick = (e)=>{ e.preventDefault(); if (fileInput) fileInput.click(); };
        if (fileInput) fileInput.onchange = (e)=>{
          const f = e.target.files[0]; if(!f) return;
          const r = new FileReader();
          r.onload = (ev)=>{
            const modal = document.getElementById('img-cropper-modal');
            const img = document.getElementById('img-cropper-image');
            img.src = ev.target.result; modal.style.display='flex';
            if (cropper) { cropper.destroy(); cropper=null; }
            cropper = new Cropper(img, { aspectRatio: 4/5, viewMode:1, autoCropArea:1 });
          };
          r.readAsDataURL(f);
        };
        const close = ()=>{ const m=document.getElementById('img-cropper-modal'); m.style.display='none'; if(cropper){ cropper.destroy(); cropper=null; } };
        document.getElementById('img-cropper-close').onclick = close;
        document.getElementById('img-cropper-cancel').onclick = close;
        const okBtn = document.getElementById('img-cropper-ok');
        okBtn.onclick = null; // 중복 바인딩 방지
        okBtn.onclick = async ()=>{
          if (!cropper) return;
          cropper.getCroppedCanvas().toBlob(async (blob)=>{
            const form = new FormData(); form.append('image', blob, 'character.jpg');
            let res;
            if (character && character._id) res = await fetch(`/api/admin/characters/${character._id}/image`, { method:'POST', credentials:'include', body:form });
            else res = await fetch(`/api/admin/uploads/characters`, { method:'POST', credentials:'include', body:form });
            if (res.ok){ const d = await res.json(); const input = document.getElementById('edit-character-image'); if (input) input.value = d.path; if (preview) preview.style.backgroundImage = `url('${d.path}?v=${Date.now()}')`; close(); }
            else alert('이미지 업로드 실패');
          }, 'image/jpeg', 0.9);
        };
      })();

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
      // [수정] 작품이 없는 경우에도 UI를 초기화합니다.
      this.setSelectedWorksForEdit([], {});
    }
  }

  // [수정] 이전 버전의 로직 복원 및 개선
  setSelectedWorksForEdit(workIds, workCharacterNames = {}) {
    const selectedWorksContainer = document.getElementById('edit-selected-works');
    const nameRow = document.getElementById('edit-work-character-names-row');
    const nameList = document.getElementById('edit-work-character-names');
    
    if (!selectedWorksContainer || !nameRow || !nameList) {
      console.error('인물 수정 모달의 필수 DOM 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 기존 선택 초기화
    selectedWorksContainer.innerHTML = '';
    nameList.innerHTML = '';
    
    if (!workIds || workIds.length === 0) {
      selectedWorksContainer.innerHTML = '<span class="placeholder">작품을 선택하세요</span>';
      nameRow.style.display = 'none';
      return;
    }
    
    // 선택된 작품들을 기반으로 UI 구성
    workIds.forEach(workId => {
      const workOption = document.querySelector(`#edit-works-dropdown .work-option[data-work-id="${workId}"]`);
      if (workOption) {
        const workTitle = workOption.querySelector('.work-title').textContent.trim();
        const roleName = workCharacterNames[workId] || '';
        
        this.addSelectedWorkTagForEdit(workId, workTitle);
        this.addWorkCharacterNameInputForEdit(workId, workTitle, nameRow, nameList, roleName);
      } else {
        console.warn(`ID '${workId}'에 해당하는 작품을 드롭다운에서 찾지 못했습니다.`);
      }
    });

    nameRow.style.display = 'block';
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

    // 검색 필터링 (인물 수정 모달)
    const searchInput = newDropdown.querySelector('.search-input');
    const optionsContainer = newDropdown.querySelector('.options');
    if (searchInput && optionsContainer) {
      searchInput.oninput = () => {
        const q = searchInput.value.trim().toLowerCase();
        optionsContainer.querySelectorAll('.work-option').forEach(opt => {
          const title = opt.querySelector('.work-title')?.textContent?.toLowerCase() || '';
          const typeText = opt.querySelector('.work-type')?.textContent?.toLowerCase() || '';
          opt.style.display = (title.includes(q) || typeText.includes(q)) ? '' : 'none';
        });
      };
    }
    
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
      
      // 선택된 작품과 작중이름 수집을 안정적으로 처리
      const workIdsSet = new Set();
      const workCharacterNames = {};

      // 1) 작중이름 입력 아이템에서 먼저 수집 (UI 상 항상 쌍으로 존재)
      const nameItems = document.querySelectorAll('#edit-work-character-names .work-character-name-item');
      nameItems.forEach(item => {
        const workId = item.getAttribute('data-work-id');
        if (!workId) return;
        workIdsSet.add(workId);
        const input = item.querySelector('input.work-character-name-input');
        const value = (input?.value || '').trim();
        if (value) {
          workCharacterNames[workId] = value;
        }
      });

      // 2) 선택된 작품 뱃지에서도 보강 수집 (혹시 아이템 누락 대비)
      const selectedWorkTags = document.querySelectorAll('#edit-selected-works .selected-work-tag');
      selectedWorkTags.forEach(tag => {
        const workId = tag.getAttribute('data-work-id');
        if (workId) workIdsSet.add(workId);
      });

      const workIds = Array.from(workIdsSet);
      
      characterData.workIds = workIds;
      characterData.workCharacterNames = workCharacterNames;
      
      // 디버깅: 수집된 데이터 확인
      console.log('=== 인물 수정 데이터 수집 ===');
      console.log('characterId:', characterId);
      console.log('workIds (collected):', workIds);
      console.log('workCharacterNames (collected):', workCharacterNames);
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
      
      // 인물 데이터 수집 (통합 카드형)
      const characterIds = [];
      const characters = [];
      const characterCards = document.querySelectorAll('#character-cards .character-card');
      characterCards.forEach(card => {
        const characterId = card.dataset.characterId;
        const characterName = card.querySelector('.character-name').textContent.trim();
        const roleName = card.querySelector('.character-role-input').value.trim();
        
        characterIds.push(characterId);
        characters.push(`${characterName}(${roleName || '정보 없음'})`);
      });

      // 장소 데이터 수집
      const placeIds = Array.from(document.querySelectorAll('#selected-places .selected-work-tag'))
        .map(tag => tag.dataset.placeId);

      const payload = {
        title,
        type,
        releaseDate,
        description,
        image,
        characters,
        characterIds,
        placeIds
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
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '작품 수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('작품 수정 오류:', error);
      alert(`작품 수정 중 오류가 발생했습니다: ${error.message}`);
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

  // 작품 수정 모달용 인물 선택 기능 설정 (통합 카드형)
  setupWorkCharacterSelection(characters) {
    const characterCards = document.getElementById('character-cards');
    const dropdown = document.getElementById('characters-dropdown');
    const addBtn = document.getElementById('add-character-btn');
    
    let allCharacters = characters;

    const getSelectedCharacterIds = () => Array.from(document.querySelectorAll('#character-cards .character-card'))
      .map(card => card.dataset.characterId);

    // 기존 이벤트 리스너 제거 및 재설정
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    newDropdown.innerHTML = `
      <div class="search-container">
        <input type="text" id="character-search" placeholder="인물 검색..." class="search-input">
      </div>
      <div class="character-options" id="character-options"></div>
    `;

    const searchInput = newDropdown.querySelector('#character-search');

    const renderCharacterOptions = () => {
      const selectedIds = new Set(getSelectedCharacterIds());
      const searchTerm = (newDropdown.querySelector('#character-search')?.value || '').toLowerCase();
      const filtered = allCharacters.filter(ch => !selectedIds.has(ch._id) && (
        ch.name.toLowerCase().includes(searchTerm) || (ch.job || '').toLowerCase().includes(searchTerm)
      ));
      const optionsContainer = newDropdown.querySelector('#character-options');
      if (!optionsContainer) return;
      optionsContainer.innerHTML = filtered.map(character => `
        <div class="character-option" data-character-id="${character._id}">
          <div class="character-name">${character.name}</div>
          <div class="character-job">${character.job || ''}</div>
        </div>
      `).join('');
    };

    // 최초 렌더
    renderCharacterOptions();

    searchInput.addEventListener('input', () => renderCharacterOptions());

    addBtn.addEventListener('click', () => {
      newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
      if (newDropdown.style.display === 'block') {
        renderCharacterOptions();
        searchInput.focus();
      }
    });

    // 통합 카드 컨테이너의 삭제 버튼 이벤트 위임
    characterCards.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.btn-remove');
      if (!removeBtn) return;
      e.stopPropagation();
      const card = removeBtn.closest('.character-card');
      if (!card) return;
      const characterId = card.dataset.characterId;
      card.remove();
      this.updateCharacterCardsEmptyState();
      renderCharacterOptions();
    });

    newDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.character-option');
      if (!option) return;
      const characterId = option.dataset.characterId;
      const characterName = option.querySelector('.character-name').textContent;
      this.addCharacterCard(characterId, characterName);
      newDropdown.style.display = 'none';
      searchInput.value = '';
      renderCharacterOptions();
    });
  }

  // 작품 수정 모달용 장소 선택 기능 설정
  setupWorkPlaceSelection(places) {
    const selectedPlaces = document.getElementById('selected-places');
    const dropdown = document.getElementById('places-dropdown');
    const addBtn = document.getElementById('add-place-btn');
    
    let allPlaces = places;

    const getSelectedPlaceIds = () => Array.from(document.querySelectorAll('#selected-places .selected-work-tag'))
      .map(tag => tag.dataset.placeId);

    // 기존 이벤트 리스너 제거 및 재설정
    const newSelectedPlaces = selectedPlaces.cloneNode(true);
    selectedPlaces.parentNode.replaceChild(newSelectedPlaces, selectedPlaces);
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    newDropdown.innerHTML = `
      <div class="search-container">
        <input type="text" id="place-search" placeholder="장소 검색..." class="search-input">
      </div>
      <div class="place-options" id="place-options"></div>
    `;

    const searchInput = newDropdown.querySelector('#place-search');

    const renderPlaceOptions = () => {
      const selectedIds = new Set(getSelectedPlaceIds());
      const searchTerm = (newDropdown.querySelector('#place-search')?.value || '').toLowerCase();
      const filtered = allPlaces.filter(pl => !selectedIds.has(pl._id) && (
        (pl.real_name || pl.fictional_name || '').toLowerCase().includes(searchTerm) ||
        (pl.address || '').toLowerCase().includes(searchTerm)
      ));
      const optionsContainer = newDropdown.querySelector('#place-options');
      if (!optionsContainer) return;
      optionsContainer.innerHTML = filtered.map(place => `
        <div class="place-option" data-place-id="${place._id}">
          <div class="place-name">${place.real_name || place.fictional_name}</div>
          <div class="place-address">${place.address || ''}</div>
        </div>
      `).join('');
    };

    renderPlaceOptions();

    searchInput.addEventListener('input', () => renderPlaceOptions());

    addBtn.addEventListener('click', () => {
      newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
      if (newDropdown.style.display === 'block') {
        renderPlaceOptions();
        searchInput.focus();
      }
    });

    newSelectedPlaces.addEventListener('click', () => {
      newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
      if (newDropdown.style.display === 'block') {
        renderPlaceOptions();
        searchInput.focus();
      }
    });

    // 컨테이너 위임: 기존/신규 태그의 X 클릭 처리
    newSelectedPlaces.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove');
      if (!removeBtn) return;
      e.stopPropagation();
      const tag = removeBtn.closest('.selected-work-tag');
      if (!tag) return;
      const placeId = tag.dataset.placeId;
      tag.remove();
      if (newSelectedPlaces.children.length === 0) {
        newSelectedPlaces.innerHTML = '<span class="placeholder">장소를 선택하세요</span>';
      }
      // 드롭다운 옵션 갱신
      renderPlaceOptions();
    });

    newDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.place-option');
      if (!option) return;
      const placeId = option.dataset.placeId;
      const placeName = option.querySelector('.place-name').textContent;
      this.addSelectedPlaceTag(placeId, placeName);
      newDropdown.style.display = 'none';
      searchInput.value = '';
      renderPlaceOptions();
    });
  }

  // 선택된 인물 태그 추가
  addSelectedCharacterTag(characterId, characterName) {
    const selectedCharacters = document.getElementById('selected-characters');
    const placeholder = selectedCharacters.querySelector('.placeholder');
    if (placeholder) placeholder.remove();
    const tag = document.createElement('div');
    tag.className = 'selected-work-tag';
    tag.setAttribute('data-character-id', characterId);
    tag.innerHTML = `
      ${characterName}
      <span class="remove" data-character-id="${characterId}">&times;</span>
    `;
    tag.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      tag.remove();
      this.removeWorkCharacterNameInput(characterId);
      if (selectedCharacters.children.length === 0) {
        selectedCharacters.innerHTML = '<span class="placeholder">인물을 선택하세요</span>';
        const nameRow = document.getElementById('work-character-names-row');
        if (nameRow) nameRow.style.display = 'none';
      }
      // 드롭다운 옵션 갱신
      const dropdown = document.getElementById('characters-dropdown');
      const searchInput = dropdown?.querySelector('#character-search');
      if (searchInput) searchInput.dispatchEvent(new Event('input'));
    });
    selectedCharacters.appendChild(tag);
  }

  // 선택된 장소 태그 추가
  addSelectedPlaceTag(placeId, placeName) {
    const selectedPlaces = document.getElementById('selected-places');
    const placeholder = selectedPlaces.querySelector('.placeholder');
    if (placeholder) placeholder.remove();
    const tag = document.createElement('div');
    tag.className = 'selected-work-tag';
    tag.setAttribute('data-place-id', placeId);
    tag.innerHTML = `
      ${placeName}
      <span class="remove" data-place-id="${placeId}">&times;</span>
    `;
    tag.querySelector('.remove').addEventListener('click', (e) => {
      e.stopPropagation();
      tag.remove();
      if (selectedPlaces.children.length === 0) {
        selectedPlaces.innerHTML = '<span class="placeholder">장소를 선택하세요</span>';
      }
      // 드롭다운 옵션 갱신
      const dropdown = document.getElementById('places-dropdown');
      const searchInput = dropdown?.querySelector('#place-search');
      if (searchInput) searchInput.dispatchEvent(new Event('input'));
    });
    selectedPlaces.appendChild(tag);
  }

  // 작품용 작중이름 입력칸 추가
  addWorkCharacterNameInput(characterId, characterName, nameRow, nameList) {
    if (nameRow.style.display === 'none') nameRow.style.display = 'block';
    
    const item = document.createElement('div');
    item.className = 'work-character-name-item';
    item.dataset.characterId = characterId;
    item.innerHTML = `
      <div class="work-title">${characterName}</div>
      <input type="text" class="work-character-name-input" placeholder="작중이름 입력">
    `;
    
    nameList.appendChild(item);
  }

  // 작품용 작중이름 입력칸 제거
  removeWorkCharacterNameInput(characterId) {
    const nameList = document.getElementById('work-character-names');
    if (nameList) {
      const item = nameList.querySelector(`[data-character-id="${characterId}"]`);
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

  // 작품 수정 모달에 기존 데이터 표시
  populateWorkEditExistingData(work, allCharacters, allPlaces) {
    const selectedPlaces = document.getElementById('selected-places');
    
    // 기존 내용 초기화
    selectedPlaces.innerHTML = '<span class="placeholder">장소를 선택하세요</span>';

    // 기존 인물 데이터를 통합 카드형으로 표시
    this.populateWorkEditExistingCharacters(work, allCharacters);
    
    // 기존 장소 데이터 표시
    if (work.placeIds && work.placeIds.length > 0) {
      selectedPlaces.innerHTML = ''; // placeholder 제거
      
      work.placeIds.forEach(placeRef => {
        // placeRef가 객체인지 문자열 ID인지 확인
        const placeId = typeof placeRef === 'object' && placeRef._id ? placeRef._id : placeRef;
        const place = allPlaces.find(p => p._id === placeId);
        
        if (place) {
          const placeName = place.real_name || place.fictional_name;
          this.addSelectedPlaceTag(placeId, placeName);
        }
      });
    }
  }

  // 작품용 작중이름 입력칸 추가 (기존 값 포함)
  addWorkCharacterNameInputWithValue(characterId, characterName, existingValue, nameRow, nameList) {
    if (nameRow.style.display === 'none') nameRow.style.display = 'block';
    
    const item = document.createElement('div');
    item.className = 'work-character-name-item';
    item.dataset.characterId = characterId;
    item.innerHTML = `
      <div class="work-title">${characterName}</div>
      <input type="text" class="work-character-name-input" placeholder="작중이름 입력" value="${existingValue}">
    `;
    
    nameList.appendChild(item);
  }

  // 통합 카드형 UI 헬퍼 함수들
  
  // 인물 카드 추가
  addCharacterCard(characterId, characterName, roleName = '') {
    const characterCards = document.getElementById('character-cards');
    
    // 빈 상태 제거
    const emptyState = characterCards.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
    
    // 새 카드 생성
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.characterId = characterId;
    card.innerHTML = `
      <div class="character-name">${characterName}</div>
      <input type="text" class="character-role-input" placeholder="작중이름을 입력하세요" value="${roleName}">
      <div class="character-actions">
        <button type="button" class="btn-remove" title="제거">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    characterCards.appendChild(card);
  }
  
  // 인물 카드들 빈 상태 업데이트
  updateCharacterCardsEmptyState() {
    const characterCards = document.getElementById('character-cards');
    const existingCards = characterCards.querySelectorAll('.character-card');
    
    if (existingCards.length === 0) {
      characterCards.innerHTML = `
        <div class="empty-state">
          <span class="placeholder">인물을 선택하세요</span>
        </div>
      `;
    }
  }
  
  // 기존 인물 데이터를 통합 카드형으로 표시
  populateWorkEditExistingCharacters(work, allCharacters) {
    const characterCards = document.getElementById('character-cards');
    
    // 기존 내용 초기화
    characterCards.innerHTML = '';
    
    if (!work.characterIds || work.characterIds.length === 0) {
      this.updateCharacterCardsEmptyState();
      return;
    }
    
    work.characterIds.forEach((characterRef, index) => {
      const characterId = typeof characterRef === 'object' && characterRef._id ? characterRef._id : characterRef;
      const character = allCharacters.find(c => c._id === characterId);
      
      if (character) {
        let roleName = '';
        if (work.characters && work.characters[index]) {
          const match = work.characters[index].match(/^.+?\((.+)\)$/);
          if (match && match[1]) {
            roleName = match[1];
          }
        }
        this.addCharacterCard(characterId, character.name, roleName);
      }
    });
  }

  // 작품 추가 모달용 헬퍼 함수들
  
  // 작품 추가 모달에 기존 데이터 표시 (수정 모드용)
  populateWorkAddModalExistingData(work, allCharacters, allPlaces) {
    const selectedPlaces = document.getElementById('w-selected-places');
    
    // 기존 내용 초기화
    selectedPlaces.innerHTML = '<span class="placeholder">장소를 선택하세요</span>';

    // 기존 인물 데이터를 통합 카드형으로 표시
    this.populateWorkAddModalExistingCharacters(work, allCharacters);
    
    // 기존 장소 데이터 표시
    if (work.placeIds && work.placeIds.length > 0) {
      selectedPlaces.innerHTML = ''; // placeholder 제거
      
      work.placeIds.forEach(placeRef => {
        // placeRef가 객체인지 문자열 ID인지 확인
        const placeId = typeof placeRef === 'object' && placeRef._id ? placeRef._id : placeRef;
        const place = allPlaces.find(p => p._id === placeId);
        
        if (place) {
          const placeName = place.real_name || place.fictional_name;
          this.addWorkAddModalSelectedPlaceTag(placeId, placeName);
        }
      });
    }
  }
  
  // 작품 추가 모달용 기존 인물 데이터 표시
  populateWorkAddModalExistingCharacters(work, allCharacters) {
    const characterCards = document.getElementById('w-character-cards');
    
    // 기존 내용 초기화
    characterCards.innerHTML = '';
    
    if (!work.characterIds || work.characterIds.length === 0) {
      this.updateWorkAddModalCharacterCardsEmptyState();
      return;
    }
    
    work.characterIds.forEach((characterRef, index) => {
      const characterId = typeof characterRef === 'object' && characterRef._id ? characterRef._id : characterRef;
      const character = allCharacters.find(c => c._id === characterId);
      
      if (character) {
        let roleName = '';
        if (work.characters && work.characters[index]) {
          const match = work.characters[index].match(/^.+?\((.+)\)$/);
          if (match && match[1]) {
            roleName = match[1];
          }
        }
        this.addWorkAddModalCharacterCard(characterId, character.name, roleName);
      }
    });
  }
  
  // 작품 추가 모달용 인물 카드 추가
  addWorkAddModalCharacterCard(characterId, characterName, roleName = '') {
    const characterCards = document.getElementById('w-character-cards');
    
    // 빈 상태 제거
    const emptyState = characterCards.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }
    
    // 새 카드 생성
    const card = document.createElement('div');
    card.className = 'character-card';
    card.dataset.characterId = characterId;
    card.innerHTML = `
      <div class="character-name">${characterName}</div>
      <input type="text" class="character-role-input" placeholder="작중이름을 입력하세요" value="${roleName}">
      <div class="character-actions">
        <button type="button" class="btn-remove" title="제거">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    characterCards.appendChild(card);
  }
  
  // 작품 추가 모달용 인물 카드들 빈 상태 업데이트
  updateWorkAddModalCharacterCardsEmptyState() {
    const characterCards = document.getElementById('w-character-cards');
    const existingCards = characterCards.querySelectorAll('.character-card');
    
    if (existingCards.length === 0) {
      characterCards.innerHTML = `
        <div class="empty-state">
          <span class="placeholder">인물을 선택하세요</span>
        </div>
      `;
    }
  }
  
  // 작품 추가 모달용 인물 선택 기능 설정
  setupWorkAddModalCharacterSelection(characters) {
    const characterCards = document.getElementById('w-character-cards');
    const dropdown = document.getElementById('w-characters-dropdown');
    const addBtn = document.getElementById('w-add-character-btn');
    
    let allCharacters = characters;

    const getSelectedCharacterIds = () => Array.from(document.querySelectorAll('#w-character-cards .character-card'))
      .map(card => card.dataset.characterId);

    // 기존 이벤트 리스너 제거 및 재설정
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    newDropdown.innerHTML = `
      <div class="search-container">
        <input type="text" id="w-character-search" placeholder="인물 검색..." class="search-input">
      </div>
      <div class="character-options" id="w-character-options"></div>
    `;

    const searchInput = newDropdown.querySelector('#w-character-search');

    const renderCharacterOptions = () => {
      const selectedIds = new Set(getSelectedCharacterIds());
      const searchTerm = (newDropdown.querySelector('#w-character-search')?.value || '').toLowerCase();
      const filtered = allCharacters.filter(ch => !selectedIds.has(ch._id) && (
        ch.name.toLowerCase().includes(searchTerm) || (ch.job || '').toLowerCase().includes(searchTerm)
      ));
      const optionsContainer = newDropdown.querySelector('#w-character-options');
      if (!optionsContainer) return;
      optionsContainer.innerHTML = filtered.map(character => `
        <div class="character-option" data-character-id="${character._id}">
          <div class="character-name">${character.name}</div>
          <div class="character-job">${character.job || ''}</div>
        </div>
      `).join('');
    };

    // 최초 렌더
    renderCharacterOptions();

    searchInput.addEventListener('input', () => renderCharacterOptions());

    addBtn.addEventListener('click', () => {
      newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
      if (newDropdown.style.display === 'block') {
        renderCharacterOptions();
        searchInput.focus();
      }
    });

    // 통합 카드 컨테이너의 삭제 버튼 이벤트 위임
    characterCards.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.btn-remove');
      if (!removeBtn) return;
      e.stopPropagation();
      const card = removeBtn.closest('.character-card');
      if (!card) return;
      const characterId = card.dataset.characterId;
      card.remove();
      this.updateWorkAddModalCharacterCardsEmptyState();
      renderCharacterOptions();
    });

    newDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.character-option');
      if (!option) return;
      const characterId = option.dataset.characterId;
      const characterName = option.querySelector('.character-name').textContent;
      this.addWorkAddModalCharacterCard(characterId, characterName);
      newDropdown.style.display = 'none';
      searchInput.value = '';
      renderCharacterOptions();
    });
  }
  
  // 작품 추가 모달용 장소 선택 기능 설정
  setupWorkAddModalPlaceSelection(places) {
    const selectedPlaces = document.getElementById('w-selected-places');
    const dropdown = document.getElementById('w-places-dropdown');
    const addBtn = document.getElementById('w-add-place-btn');
    
    let allPlaces = places;

    const getSelectedPlaceIds = () => Array.from(document.querySelectorAll('#w-selected-places .selected-work-tag'))
      .map(tag => tag.dataset.placeId);

    // 기존 이벤트 리스너 제거 및 재설정
    const newSelectedPlaces = selectedPlaces.cloneNode(true);
    selectedPlaces.parentNode.replaceChild(newSelectedPlaces, selectedPlaces);
    const newDropdown = dropdown.cloneNode(true);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);

    newDropdown.innerHTML = `
      <div class="search-container">
        <input type="text" id="w-place-search" placeholder="장소 검색..." class="search-input">
      </div>
      <div class="place-options" id="w-place-options"></div>
    `;

    const searchInput = newDropdown.querySelector('#w-place-search');

    const renderPlaceOptions = () => {
      const selectedIds = new Set(getSelectedPlaceIds());
      const searchTerm = (newDropdown.querySelector('#w-place-search')?.value || '').toLowerCase();
      const filtered = allPlaces.filter(place => !selectedIds.has(place._id) && (
        (place.real_name || '').toLowerCase().includes(searchTerm) || 
        (place.fictional_name || '').toLowerCase().includes(searchTerm)
      ));
      const optionsContainer = newDropdown.querySelector('#w-place-options');
      if (!optionsContainer) return;
      optionsContainer.innerHTML = filtered.map(place => `
        <div class="place-option" data-place-id="${place._id}">
          <div class="place-name">${place.real_name || place.fictional_name}</div>
        </div>
      `).join('');
    };

    // 최초 렌더
    renderPlaceOptions();

    searchInput.addEventListener('input', () => renderPlaceOptions());

    addBtn.addEventListener('click', () => {
      newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
      if (newDropdown.style.display === 'block') {
        renderPlaceOptions();
        searchInput.focus();
      }
    });

    newSelectedPlaces.addEventListener('click', () => {
      newDropdown.style.display = newDropdown.style.display === 'none' ? 'block' : 'none';
      if (newDropdown.style.display === 'block') {
        renderPlaceOptions();
        searchInput.focus();
      }
    });

    // 컨테이너 위임: 기존/신규 태그의 X 클릭 처리
    newSelectedPlaces.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove');
      if (!removeBtn) return;
      e.stopPropagation();
      const tag = removeBtn.closest('.selected-work-tag');
      if (!tag) return;
      const placeId = tag.dataset.placeId;
      tag.remove();
      if (newSelectedPlaces.children.length === 0) {
        newSelectedPlaces.innerHTML = '<span class="placeholder">장소를 선택하세요</span>';
      }
      renderPlaceOptions();
    });

    newDropdown.addEventListener('click', (e) => {
      const option = e.target.closest('.place-option');
      if (!option) return;
      const placeId = option.dataset.placeId;
      const placeName = option.querySelector('.place-name').textContent;
      this.addWorkAddModalSelectedPlaceTag(placeId, placeName);
      newDropdown.style.display = 'none';
      searchInput.value = '';
      renderPlaceOptions();
    });
  }
  
  // 작품 추가 모달용 선택된 장소 태그 추가
  addWorkAddModalSelectedPlaceTag(placeId, placeName) {
    const selectedPlaces = document.getElementById('w-selected-places');
    const placeholder = selectedPlaces.querySelector('.placeholder');
    if (placeholder) placeholder.remove();
    const tag = document.createElement('div');
    tag.className = 'selected-work-tag';
    tag.setAttribute('data-place-id', placeId);
    tag.innerHTML = `
      ${placeName}
      <span class="remove" data-place-id="${placeId}">&times;</span>
    `;
    selectedPlaces.appendChild(tag);
  }
  
  // 작품 추가 모달 저장
  async saveWorkAddModal(work = null) {
    try {
      // 폼 데이터 수집
      const title = document.getElementById('w-title').value;
      const type = document.getElementById('w-type').value;
      const releaseDate = document.getElementById('w-releaseDate').value;
      const description = document.getElementById('w-description').value;
      const image = document.getElementById('w-image').value;
      
      // 필수 필드 검증
      if (!title.trim()) {
        alert('작품 제목을 입력해주세요.');
        return;
      }
      if (!type) {
        alert('작품 타입을 선택해주세요.');
        return;
      }
      
      // 인물 데이터 수집 (통합 카드형)
      const characterIds = [];
      const characters = [];
      const characterCards = document.querySelectorAll('#w-character-cards .character-card');
      characterCards.forEach(card => {
        const characterId = card.dataset.characterId;
        const characterName = card.querySelector('.character-name').textContent.trim();
        const roleName = card.querySelector('.character-role-input').value.trim();
        
        characterIds.push(characterId);
        characters.push(`${characterName}(${roleName || '정보 없음'})`);
      });

      // 장소 데이터 수집
      const placeIds = Array.from(document.querySelectorAll('#w-selected-places .selected-work-tag'))
        .map(tag => tag.dataset.placeId);

      const payload = {
        title,
        type,
        releaseDate,
        description,
        image,
        characters,
        characterIds,
        placeIds
      };

      const url = work ? `/api/admin/works/${work._id}` : '/api/admin/works';
      const method = work ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert(work ? '작품이 성공적으로 수정되었습니다.' : '작품이 성공적으로 추가되었습니다.');
        this.closeModal();
        this.loadWorks();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || '작품 저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('작품 저장 오류:', error);
      alert(`작품 저장 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  // 세련된 날짜 선택기 설정
  setupDatePicker(inputId, iconId, popupId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    const popup = document.getElementById(popupId);
    
    if (!input || !icon || !popup) return;

    let currentDate = new Date();
    let selectedDate = null;

    // 달력 아이콘 클릭 이벤트
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDatePicker();
    });

    // 입력 필드 포커스 이벤트
    input.addEventListener('focus', () => {
      // 포커스 시 달력이 열려있지 않으면 달력 열기
      if (!popup.classList.contains('show')) {
        toggleDatePicker();
      }
    });

    // 입력 필드에서 날짜 형식 자동 포맷팅
    input.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, ''); // 숫자만 추출
      
      if (value.length >= 8) {
        // YYYYMMDD 형식으로 자동 포맷팅
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        
        if (year && month && day) {
          const formattedDate = `${year}-${month}-${day}`;
          if (isValidDate(formattedDate)) {
            input.value = formattedDate;
            selectedDate = new Date(year, month - 1, day);
            updateDatePicker();
          }
        }
      }
    });

    // 달력 토글 함수
    function toggleDatePicker() {
      if (popup.classList.contains('show')) {
        hideDatePicker();
      } else {
        showDatePicker();
      }
    }

    // 달력 표시
    function showDatePicker() {
      // 현재 입력된 날짜가 있으면 해당 날짜로 설정
      if (input.value && isValidDate(input.value)) {
        selectedDate = new Date(input.value);
        currentDate = new Date(selectedDate);
      }
      
      renderDatePicker();
      popup.classList.add('show');
      
      // 외부 클릭 시 달력 닫기
      setTimeout(() => {
        document.addEventListener('click', hideDatePickerOnOutsideClick);
      }, 100);
    }

    // 달력 숨기기
    function hideDatePicker() {
      popup.classList.remove('show');
      document.removeEventListener('click', hideDatePickerOnOutsideClick);
    }

    // 외부 클릭 시 달력 닫기
    function hideDatePickerOnOutsideClick(e) {
      if (!popup.contains(e.target) && !input.contains(e.target) && !icon.contains(e.target)) {
        hideDatePicker();
      }
    }

    // 달력 렌더링
    function renderDatePicker() {
      // 기존 내용 완전히 제거
      popup.innerHTML = '';
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      
      // 달력 헤더
      const header = document.createElement('div');
      header.className = 'date-picker-header';
      header.innerHTML = `
        <button class="date-picker-nav" data-direction="-1">‹</button>
        <div class="date-picker-month-year">${year}년 ${monthNames[month]}</div>
        <button class="date-picker-nav" data-direction="1">›</button>
      `;
      
      // 달력 그리드
      const grid = document.createElement('div');
      grid.className = 'date-picker-grid';
      
      // 요일 헤더
      dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'date-picker-day-header';
        dayHeader.textContent = day;
        grid.appendChild(dayHeader);
      });
      
      // 날짜들
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      const today = new Date();
      
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        
        const dayElement = document.createElement('div');
        dayElement.className = 'date-picker-day';
        dayElement.textContent = date.getDate();
        
        // 다른 달의 날짜
        if (date.getMonth() !== month) {
          dayElement.classList.add('other-month');
        }
        
        // 오늘
        if (date.toDateString() === today.toDateString()) {
          dayElement.classList.add('today');
        }
        
        // 선택된 날짜
        if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
          dayElement.classList.add('selected');
        }
        
        // 날짜 클릭 이벤트
        dayElement.addEventListener('click', () => {
          selectDate(date);
        });
        
        grid.appendChild(dayElement);
      }
      
      popup.appendChild(header);
      popup.appendChild(grid);
      
      // 이벤트 리스너 추가 (전역 함수 대신 직접 이벤트 리스너 사용)
      // 월 변경 버튼들
      popup.querySelectorAll('.date-picker-nav').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const direction = parseInt(e.target.dataset.direction);
          currentDate.setMonth(currentDate.getMonth() + direction);
          renderDatePicker();
        });
      });
    }

    // 날짜 선택
    function selectDate(date) {
      selectedDate = new Date(date);
      input.value = formatDate(selectedDate);
      hideDatePicker();
    }

    // 달력 업데이트 (월 변경 시에만 사용)
    function updateDatePicker() {
      renderDatePicker();
    }

    // 날짜 유효성 검사
    function isValidDate(dateString) {
      const date = new Date(dateString);
      return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
    }

    // 날짜 포맷팅
    function formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // 인물 삭제
  async deleteCharacter(characterId, characterName) {
    // 사용자에게 삭제 여부 확인
    if (!confirm(`'${characterName}' 인물을 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/characters/${characterId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        alert(`'${characterName}' 인물이 성공적으로 삭제되었습니다.`);
        this.loadCharacters(); // 목록 새로고침
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || '인물 삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('인물 삭제 오류:', error);
      alert(`오류: ${error.message}`);
    }
  }

  // 장소 수정 버튼 동작: 서버에서 상세 조회 후 모달 오픈
  async openPlaceEditModal(placeId) {
    try {
      const res = await fetch(`/api/admin/places/${placeId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('장소 정보를 불러오지 못했습니다.');
      const data = await res.json();
      const place = data.place;
      const linkedWorks = data.works || [];

      // 전체 작품 목록도 가져와서 선택 가능하게 함
      const worksRes = await fetch('/api/admin/works?page=1&limit=1000', { credentials: 'include' });
      const worksData = worksRes.ok ? await worksRes.json() : { works: [] };

      this.openPlaceModal(place, worksData.works, linkedWorks.map(w => w._id));
    } catch (e) {
      alert(e.message || '장소 정보를 불러오지 못했습니다.');
    }
  }
  
}

// 전역 변수로 대시보드 인스턴스 생성
let dashboard;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  dashboard = new AdminDashboard();
});
