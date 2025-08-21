// public/js/utils.js

export function formatPlaceName(real_name, fictional_name) {
  if (real_name && fictional_name) {
    return `${real_name} / ${fictional_name}`;
  } else if (real_name) {
    return real_name;
  } else if (fictional_name) {
    return fictional_name;
  } else {
    return '';
  }
}

// 간단 Toast 유틸
let toastTimer = null;
export function showToast(message, type = 'default') {
  let el = document.querySelector('.filo-toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'filo-toast';
    document.body.appendChild(el);
  }
  el.className = `filo-toast ${type === 'success' ? 'success' : type === 'error' ? 'error' : ''}`;
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// 상대 시간 표기 (e.g., 방금 전, 3분 전, 2시간 전, 5일 전)
export function formatRelativeTime(dateInput) {
  const ts = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput).getTime()
    : dateInput.getTime();
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 5) return '방금 전';
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return `${diffWeek}주 전`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}개월 전`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear}년 전`;
}

// 댓글 입력창 자동 크기 조절 설정 (공통 함수)
export function setupCommentAutoResize() {
  const input = document.getElementById('comment-input');
  if (!input) return; // 댓글 입력창이 없으면 종료
  
  // 자동 크기 조절 함수
  const autoResize = () => {
    input.style.height = 'auto'; // 높이 초기화
    input.style.height = input.scrollHeight + 'px'; // 내용에 맞게 높이 조정
  };
  
  // 입력 이벤트에 자동 크기 조절 연결
  input.addEventListener('input', autoResize);
  
  // 초기 크기 설정
  autoResize();
}

// 로그인 상태 체크 함수 (공통)
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
          redirectPath = '/places.html';
        }
      }

      window.location.href = `/auth/logout?redirect_uri=${encodeURIComponent(redirectPath)}`;
    });
  }

  // 호출 측에서 사용자 객체를 활용할 수 있게 반환
  return user;
}