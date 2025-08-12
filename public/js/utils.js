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