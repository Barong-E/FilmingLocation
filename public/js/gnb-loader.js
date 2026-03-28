// GNB 로더 - 모바일 하단 네비게이션
let isGNBLoaded = false; // 중복 로드 방지

// GNB 로드 및 활성 탭 설정
export async function loadGNB() {
  if (isGNBLoaded) {
    console.log('[gnb-loader] 이미 로드됨, 중복 실행 방지');
    return;
  }

  try {
    // GNB HTML 로드
    const response = await fetch('/partials/gnb.html');
    if (!response.ok) throw new Error('GNB HTML 로드 실패');
    
    const gnbHTML = await response.text();
    
    // GNB 컨테이너 생성 및 삽입
    const gnbContainer = document.createElement('div');
    gnbContainer.id = 'app-gnb-container';
    gnbContainer.innerHTML = gnbHTML;
    
    // body 끝에 삽입
    document.body.appendChild(gnbContainer);
    
    // 활성 탭 설정
    setActiveTab();
    
    // iOS safe area 적용
    applySafeAreaPadding();
    
    // 이벤트 리스너 설정
    setupGNBEvents();
    
    isGNBLoaded = true;
    console.log('[gnb-loader] GNB 로드 완료');
    
  } catch (error) {
    console.error('[gnb-loader] GNB 로드 실패:', error);
  }
}

// 현재 경로에 맞춰 활성 탭 설정
function setActiveTab() {
  const currentPath = window.location.pathname;
  const tabs = document.querySelectorAll('.gnb-tab');
  
  tabs.forEach(tab => {
    const tabPath = tab.getAttribute('data-path');
    
    // 활성 상태 제거
    tab.classList.remove('is-active');
    tab.removeAttribute('aria-current');
    
    // 현재 경로와 매칭되는 탭 활성화
    if (currentPath === tabPath || 
        (currentPath === '/' && tabPath === '/') ||
        (currentPath.startsWith('/place') && tabPath === '/places') ||
        (currentPath.startsWith('/work') && tabPath === '/works') ||
        (currentPath.startsWith('/character') && tabPath === '/characters')) {
      
      tab.classList.add('is-active');
      tab.setAttribute('aria-current', 'page');
    }
  });
}

// iOS safe area 패딩 적용
function applySafeAreaPadding() {
  const body = document.body;
  const gnbContainer = document.getElementById('app-gnb-container');
  
  if (gnbContainer) {
    // GNB 높이만큼 body 하단 패딩 추가
    const gnbHeight = gnbContainer.offsetHeight;
    body.style.paddingBottom = `${gnbHeight}px`;
    
    // iOS safe area 고려
    const safeAreaBottom = getComputedStyle(document.documentElement)
      .getPropertyValue('--sat') || '0px';
    
    if (safeAreaBottom !== '0px') {
      body.style.paddingBottom = `calc(${gnbHeight}px + ${safeAreaBottom})`;
    }
  }
}

// GNB 이벤트 리스너 설정
function setupGNBEvents() {
  const gnb = document.querySelector('.gnb');
  if (!gnb) return;
  
  // 탭 클릭 시 활성 상태 업데이트
  gnb.addEventListener('click', (e) => {
    if (e.target.closest('.gnb-tab')) {
      // 클릭한 탭 활성화 (페이지 이동 후 자동으로 설정됨)
      setTimeout(setActiveTab, 100);
    }
  });
  
  // 화면 리사이즈 시 safe area 재계산
  window.addEventListener('resize', applySafeAreaPadding);
  window.addEventListener('orientationchange', () => {
    setTimeout(applySafeAreaPadding, 100);
  });
}

// GNB 활성 상태 새로고침 (외부에서 호출 가능)
export function refreshGNBActive() {
  if (isGNBLoaded) {
    setActiveTab();
  }
}

// 페이지 이동 시 활성 탭 자동 업데이트
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', setActiveTab);
}
