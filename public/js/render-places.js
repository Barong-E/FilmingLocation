// public/js/render-places.js
import { highlightText, smartTruncate } from './highlight-utils.js';

// 장소 카드 렌더링 함수
function getDefaultPlaceImage(name) {
  const text = (name || 'FiLo').charAt(0);
  const colors = ['#A0AEC0', '#CBD5E0', '#E2E8F0'];
  const color = colors[(name || '').length % colors.length];
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="120" fill="${color}"/>
      <text x="100" y="70" font-family="Arial, sans-serif" font-size="48" fill="#fff" text-anchor="middle">${text}</text>
    </svg>
  `)}`;
}

export function renderPlaces(places, searchQuery = '') {
  const container = document.getElementById('place-list');
  // place-list 컨테이너가 없는 페이지(예: 상세 페이지)에서는 함수를 바로 종료
  if (!container) {
    return;
  }
  
  // 🚨 안전성 검사 추가: places가 배열인지 확인
  if (!Array.isArray(places)) {
    console.warn('⚠️ renderPlaces: places가 배열이 아닙니다:', places);
    places = []; // 빈 배열로 초기화
  }
  
  container.innerHTML = '';
  
  places.forEach(place => {
    // const work = allWorks.find(w => w.id === place.workId) || {}; // 더 이상 필요 없음
    // 모든 연결 작품을 쉼표로 구분하여 표시
    const workTitle = place.relatedWorks && place.relatedWorks.length > 0 
      ? place.relatedWorks.map(work => work.title).join(', ')
      : place.workInfo?.title || '알 수 없음';
    const card = document.createElement('a');
    const pid = place.id || place._id; // 집계 결과에서 _id만 오는 경우 대비
    card.href = `/place?id=${pid}`;
    card.className = 'place-card';
    
    const displayName = place.real_name || place.fictional_name || '';
    const imgSrc = place.image || getDefaultPlaceImage(displayName);
    
    // 🎨 검색어 하이라이팅 적용
    const highlightedName = searchQuery ? highlightText(displayName, searchQuery) : displayName;
    const highlightedWorkTitle = searchQuery ? highlightText(workTitle, searchQuery) : workTitle;
    const highlightedAddress = searchQuery ? highlightText(place.address || '', searchQuery) : (place.address || '');
    
    card.innerHTML = `
      <img src="${imgSrc}" alt="${displayName}" class="place-img" onerror="this.src='${getDefaultPlaceImage(displayName)}'" />
      <div class="place-info">
        <div class="place-name">${highlightedName}</div>
        <div class="work-name">${highlightedWorkTitle}</div>
        <div class="place-address" title="${place.address || ''}">${highlightedAddress}</div>
      </div>
    `;
    container.appendChild(card);
  });
  
  // 전역 함수로도 등록 (하위 호환성)
  window.renderPlaces = renderPlaces;
}

// ───── 프로필/아이콘 동적 렌더링 ─────
export async function renderProfileArea() {
  // 로그인 상태 체크 (프로필 이미지까지)
  const res = await fetch('/api/user/me', { credentials: 'include' });
  let user = null;
  if (res.ok) user = await res.json();

  const area = document.getElementById('profile-area');
  area.innerHTML = ''; // 먼저 비우기

  if (user && user.profileImageUrl) {
    // 로그인: 프로필 이미지
    const img = document.createElement('img');
    img.src = user.profileImageUrl + '?v=' + Date.now(); // 캐시 방지
    img.alt = '프로필 이미지';
    img.className = 'profile-img-circle';
    area.appendChild(img);
  } else {
    // 비로그인: 기본 아이콘(SVG)
    const span = document.createElement('span');
    span.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="11" stroke="#333" stroke-width="2" fill="none"/>
        <circle cx="11" cy="7.7" r="4" stroke="#333" stroke-width="2" fill="none"/>
        <path d="M5 17c1.5-2 6.5-2.5 8-2.5s6.5 0.5 8 2.5" stroke="#333" stroke-width="2" fill="none"/>
      </svg>
    `;
    span.style.display = 'flex';
    span.style.alignItems = 'center';
    span.style.justifyContent = 'center';
    area.appendChild(span);
  }

  // 클릭 이벤트: 로그인 O → /mypage, 로그인 X → /login
  area.onclick = () => {
    if (user) {
      const currentPath = window.location.pathname + window.location.search; // 현재 페이지 경로 저장
      try {
        sessionStorage.setItem('prev_url_before_mypage', currentPath);
      } catch (e) { /* storage가 막힌 환경 대비 무시 */ }
              window.location.href = '/mypage';
    } else {
      // 로그인 후 돌아올 현재 페이지 주소를 쿼리 파라미터로 전달
      const redirectUrl = window.location.pathname + window.location.search;
              window.location.href = `/login?redirect_uri=${encodeURIComponent(redirectUrl)}`;
    }
  };
}

// ───── 로그인 상태 표시 바(사용 안 할 경우 무시 가능) ─────
// checkAuth 함수는 utils.js로 이동됨
