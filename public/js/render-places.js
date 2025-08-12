// public/js/render-places.js

// 작품 데이터 저장 변수 및 할당 함수
export let allWorks = [];
export function setWorks(w) { allWorks = w; }

// 장소 카드 렌더링 함수
export function renderPlaces(places) {
  const container = document.getElementById('place-list');
  // place-list 컨테이너가 없는 페이지(예: 상세 페이지)에서는 함수를 바로 종료
  if (!container) {
    return;
  }
  container.innerHTML = '';
  places.forEach(place => {
    const work = allWorks.find(w => w.id === place.workId) || {};
    const workTitle = work.title || '알 수 없음';
    const card = document.createElement('a');
    card.href = `place.html?id=${place.id}`;
    card.className = 'place-card';
    card.innerHTML = `
      <img src="${place.image}" alt="${place.real_name || place.fictional_name}" class="place-img" />
      <div class="place-info">
        <div class="place-name">${place.real_name || place.fictional_name}</div>
        <div class="work-name">${workTitle}</div>
        <div class="place-address" title="${place.address}">${place.address}</div>
      </div>
    `;
    container.appendChild(card);
  });
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
      window.location.href = '/mypage.html';
    } else {
      // 로그인 후 돌아올 현재 페이지 주소를 쿼리 파라미터로 전달
      const redirectUrl = window.location.pathname + window.location.search;
      window.location.href = `/login.html?redirect_uri=${encodeURIComponent(redirectUrl)}`;
    }
  };
}

// ───── 로그인 상태 표시 바(사용 안 할 경우 무시 가능) ─────
export async function checkAuth() {
  const res = await fetch('/auth/me', { credentials: 'include' });
  const stub = await res.json();
  let user = null;
  if (stub && stub.id) {
    // 상세 정보(닉네임, 프로필 등)를 추가로 조회
    try {
      const res2 = await fetch('/api/user/me', { credentials: 'include' });
      if (res2.ok) {
        const detailed = await res2.json();
        // 통합 사용자 객체(댓글/표시용 닉네임 포함)
        user = {
          id: detailed.id,
          displayName: detailed.displayName,
          email: detailed.email,
          nickname: detailed.nickname,
          profileImageUrl: detailed.profileImageUrl,
        };
      } else {
        user = stub; // 실패 시 기본 정보만
      }
    } catch (_) {
      user = stub;
    }
  }

  const loginBtn  = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userInfo  = document.getElementById('user-info');

  if (loginBtn && logoutBtn && userInfo) {
    if (user) {
      loginBtn.style.display  = 'none';
      logoutBtn.style.display = 'inline';
      const name = user.nickname || user.displayName || '사용자';
      userInfo.textContent     = `${name}님 환영합니다`;
    } else {
      loginBtn.style.display  = 'inline';
      logoutBtn.style.display = 'none';
      userInfo.textContent     = '';
    }

    loginBtn.addEventListener('click', e => {
      e.preventDefault();
      window.location.href = '/login';
    });

    logoutBtn.addEventListener('click', e => {
      e.preventDefault();
      const origin = window.location.origin;
      const currentPath = window.location.pathname + window.location.search;
      const ref = document.referrer;
      const isInternalRef = !!ref && ref.startsWith(origin);
      let redirectPath = currentPath;

      if (window.location.pathname === '/mypage.html') {
        if (isInternalRef) {
          const u = new URL(ref);
          redirectPath = u.pathname + u.search;
        } else {
          redirectPath = '/index.html';
        }
      }

      window.location.href = `/auth/logout?redirect_uri=${encodeURIComponent(redirectPath)}`;
    });
  }

  // 호출 측에서 사용자 객체를 활용할 수 있게 반환
  return user;
}
