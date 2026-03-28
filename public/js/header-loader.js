// public/js/header-loader.js
import { renderProfileArea } from './render-places.js';
import { initializeSearch } from './search.js'; // search.js의 초기화 함수 import

// 전역 변수로 중복 실행 방지
let isHeaderSearchInitialized = false;

// 헤더 HTML 로드
export async function loadHeader() {
  try {
    const res = await fetch('/header.html');
    if (!res.ok) throw new Error('Failed to load header.html');
    const html = await res.text();
    const headerRoot = document.getElementById('header');
    if (headerRoot) headerRoot.innerHTML = html;
  } catch (e) {
    console.error('헤더 로드 실패:', e);
    return;
  }
  // 헤더가 로드된 후, 프로필 영역 렌더링
  await renderProfileArea();
}

// 헤더 내 검색창 토글 이벤트
export function setupHeaderSearch() {
  initializeSearch(); // search.js의 데이터 로딩 및 이벤트 설정 시작

  // 중복 실행 방지
  if (isHeaderSearchInitialized) {
    console.log('[header-loader] 이미 초기화됨, 중복 실행 방지');
    return;
  }

  const header = document.getElementById('header');
  const searchIcon = header.querySelector('#search-icon');
  const profileArea = header.querySelector('#profile-area');
  const logo = header.querySelector('.logo');
  const searchWrapper = header.querySelector('.header-search-wrapper');
  const backButton = header.querySelector('#back-button');
  const headerSearchInput = header.querySelector('#header-search-input');
  const searchExecuteBtn = header.querySelector('#search-execute-btn');

  if (!searchIcon || !searchWrapper || !logo || !profileArea || !headerSearchInput || !searchExecuteBtn) {
    console.error('❌ 헤더 검색 관련 요소를 찾지 못했습니다.');
    return;
  }

  console.log('[header-loader] 검색 이벤트 초기화 시작');

  searchWrapper.style.display = 'none';

  // 검색창 열기
  searchIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    logo.style.display = 'none';
    profileArea.style.display = 'none';
    searchIcon.style.display = 'none';
    searchWrapper.style.display = 'flex';
    headerSearchInput.focus();
  });

  // 검색 실행 함수
  function executeSearch() {
    const keyword = headerSearchInput.value.trim();
    if (keyword) {
      try {
        const key = 'filo_recent_searches';
        const raw = localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(k => k.toLowerCase() !== keyword.toLowerCase());
        filtered.unshift(keyword);
        localStorage.setItem(key, JSON.stringify(filtered.slice(0, 8)));
      } catch (_) {}
      window.location.href = `/search?q=${encodeURIComponent(keyword)}`;
    }
  }

  // 검색 실행 (검색창 내부 돋보기 버튼)
  searchExecuteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    executeSearch();
  });

  // Enter 키로도 검색 실행
  headerSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  });

  // 뒤로가기 버튼으로 닫기
  backButton.addEventListener('click', () => {
    logo.style.display = 'flex';
    profileArea.style.display = 'flex';
    searchIcon.style.display = 'flex';
    searchWrapper.style.display = 'none';
    headerSearchInput.value = '';
  });

  // 바깥 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (
      searchWrapper.style.display === 'flex' &&
      !searchWrapper.contains(e.target) &&
      e.target !== searchIcon &&
      !e.target.closest('#suggestion-list') // 추천어 리스트 클릭은 제외
    ) {
      logo.style.display = 'flex';
      profileArea.style.display = 'flex';
      searchIcon.style.display = 'flex';
      searchWrapper.style.display = 'none';
      headerSearchInput.value = '';
    }
  });

  // 초기화 완료 표시
  isHeaderSearchInitialized = true;
  console.log('[header-loader] 검색 이벤트 초기화 완료');

  // 🔥 body 상단 패딩을 헤더 높이만큼 적용하여 컨텐츠 가림 방지
  const headerEl = document.querySelector('.main-header');
  const applyBodyPadding = () => {
    if (!headerEl) return;
    const h = headerEl.getBoundingClientRect().height;
    document.body.style.paddingTop = h + 'px';
  };
  applyBodyPadding();
  window.addEventListener('resize', applyBodyPadding);

  // 🔥 스크롤 방향에 따라 헤더 숨김/표시
  let lastScrollY = window.scrollY;
  let ticking = false;
  const threshold = 6; // 작은 흔들림 무시

  function onScroll() {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;
    if (Math.abs(delta) > threshold) {
      if (delta > 0) {
        // 아래로 스크롤 → 숨김
        headerEl?.classList.add('hide');
      } else {
        // 위로 스크롤 → 표시
        headerEl?.classList.remove('hide');
      }
      lastScrollY = currentY;
    }
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
}
