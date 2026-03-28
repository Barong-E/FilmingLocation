// public/js/header-loader.js
import { renderProfileArea } from './render-places.js';
import { initializeSearch } from './search.js'; // search.js의 초기화 함수 import

// 전역 변수로 중복 실행 방지
let isHeaderSearchInitialized = false;
const HEADER_ROOT_ID = 'header';
const HEADER_TEMPLATE_PATH = '/header.html';
const RECENT_SEARCH_STORAGE_KEY = 'filo_recent_searches';
const MAX_RECENT_SEARCHES = 8;
const HIDDEN_STYLE = 'none';
const VISIBLE_FLEX_STYLE = 'flex';
const SEARCH_WRAPPER_VISIBLE_STATE = VISIBLE_FLEX_STYLE;
const BODY_PADDING_UNIT = 'px';
const SCROLL_JITTER_THRESHOLD = 6;

/**
 * @typedef {Object} HeaderSearchElements
 * @property {HTMLElement} searchIcon
 * @property {HTMLElement} profileArea
 * @property {HTMLElement} logo
 * @property {HTMLElement} searchWrapper
 * @property {HTMLElement} backButton
 * @property {HTMLInputElement} headerSearchInput
 * @property {HTMLElement} searchExecuteBtn
 */

function setHeaderSearchOpenState(elements) {
  elements.logo.style.display = HIDDEN_STYLE;
  elements.profileArea.style.display = HIDDEN_STYLE;
  elements.searchIcon.style.display = HIDDEN_STYLE;
  elements.searchWrapper.style.display = VISIBLE_FLEX_STYLE;
  elements.headerSearchInput.focus();
}

function setHeaderSearchClosedState(elements) {
  elements.logo.style.display = VISIBLE_FLEX_STYLE;
  elements.profileArea.style.display = VISIBLE_FLEX_STYLE;
  elements.searchIcon.style.display = VISIBLE_FLEX_STYLE;
  elements.searchWrapper.style.display = HIDDEN_STYLE;
  elements.headerSearchInput.value = '';
}

/**
 * @param {string} keyword
 */
function saveRecentSearch(keyword) {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return;

  try {
    const rawRecentSearches = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    const recentSearches = rawRecentSearches ? JSON.parse(rawRecentSearches) : [];
    const deduplicatedSearches = recentSearches.filter(
      (searchTerm) => searchTerm.toLowerCase() !== normalizedKeyword.toLowerCase()
    );

    deduplicatedSearches.unshift(normalizedKeyword);
    localStorage.setItem(
      RECENT_SEARCH_STORAGE_KEY,
      JSON.stringify(deduplicatedSearches.slice(0, MAX_RECENT_SEARCHES))
    );
  } catch (error) {
    console.warn('[header-loader] 최근 검색어 저장 실패:', error);
  }
}

/**
 * @param {HTMLInputElement} headerSearchInput
 */
function executeHeaderSearch(headerSearchInput) {
  const keyword = headerSearchInput.value.trim();
  if (!keyword) return;

  saveRecentSearch(keyword);
  window.location.href = `/search?q=${encodeURIComponent(keyword)}`;
}

/**
 * @param {HTMLElement} headerEl
 */
function bindHeaderBodyPadding(headerEl) {
  const applyBodyPadding = () => {
    const headerHeight = headerEl.getBoundingClientRect().height;
    document.body.style.paddingTop = `${headerHeight}${BODY_PADDING_UNIT}`;
  };

  applyBodyPadding();
  window.addEventListener('resize', applyBodyPadding);
}

/**
 * @param {HTMLElement} headerEl
 */
function bindHeaderScrollVisibility(headerEl) {
  let lastScrollY = window.scrollY;
  let isAnimationFramePending = false;

  function onScroll() {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastScrollY;

    if (Math.abs(scrollDelta) > SCROLL_JITTER_THRESHOLD) {
      if (scrollDelta > 0) {
        headerEl.classList.add('hide');
      } else {
        headerEl.classList.remove('hide');
      }
      lastScrollY = currentScrollY;
    }

    isAnimationFramePending = false;
  }

  window.addEventListener(
    'scroll',
    () => {
      if (isAnimationFramePending) return;
      window.requestAnimationFrame(onScroll);
      isAnimationFramePending = true;
    },
    { passive: true }
  );
}

/**
 * @returns {HeaderSearchElements|null}
 */
function getHeaderSearchElements() {
  const headerRootElement = document.getElementById(HEADER_ROOT_ID);
  if (!headerRootElement) return null;

  const searchIcon = headerRootElement.querySelector('#search-icon');
  const profileArea = headerRootElement.querySelector('#profile-area');
  const logo = headerRootElement.querySelector('.logo');
  const searchWrapper = headerRootElement.querySelector('.header-search-wrapper');
  const backButton = headerRootElement.querySelector('#back-button');
  const headerSearchInput = headerRootElement.querySelector('#header-search-input');
  const searchExecuteBtn = headerRootElement.querySelector('#search-execute-btn');

  if (!searchIcon || !searchWrapper || !logo || !profileArea || !headerSearchInput || !searchExecuteBtn || !backButton) {
    return null;
  }

  return {
    searchIcon,
    profileArea,
    logo,
    searchWrapper,
    backButton,
    headerSearchInput,
    searchExecuteBtn,
  };
}

// 헤더 HTML 로드
export async function loadHeader() {
  try {
    const res = await fetch(HEADER_TEMPLATE_PATH);
    if (!res.ok) throw new Error('Failed to load header.html');
    const html = await res.text();
    const headerRoot = document.getElementById(HEADER_ROOT_ID);
    if (headerRoot) headerRoot.innerHTML = html;
  } catch (e) {
    console.error('헤더 로드 실패:', e);
    window.alert('헤더를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.');
    return;
  }
  // 헤더가 로드된 후, 프로필 영역 렌더링
  try {
    await renderProfileArea();
  } catch (error) {
    console.error('프로필 영역 렌더링 실패:', error);
  }
}

// 헤더 내 검색창 토글 이벤트
export function setupHeaderSearch() {
  initializeSearch(); // search.js의 데이터 로딩 및 이벤트 설정 시작

  // 중복 실행 방지
  if (isHeaderSearchInitialized) {
    console.log('[header-loader] 이미 초기화됨, 중복 실행 방지');
    return;
  }

  const elements = getHeaderSearchElements();
  if (!elements) {
    console.error('❌ 헤더 검색 관련 요소를 찾지 못했습니다.');
    return;
  }
  const { searchIcon, profileArea, logo, searchWrapper, backButton, headerSearchInput, searchExecuteBtn } = elements;

  console.log('[header-loader] 검색 이벤트 초기화 시작');

  searchWrapper.style.display = HIDDEN_STYLE;

  // 검색창 열기
  searchIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    setHeaderSearchOpenState(elements);
  });

  // 검색 실행 (검색창 내부 돋보기 버튼)
  searchExecuteBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    executeHeaderSearch(headerSearchInput);
  });

  // Enter 키로도 검색 실행
  headerSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeHeaderSearch(headerSearchInput);
    }
  });

  // 뒤로가기 버튼으로 닫기
  backButton.addEventListener('click', () => {
    setHeaderSearchClosedState(elements);
  });

  // 바깥 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (
      searchWrapper.style.display === SEARCH_WRAPPER_VISIBLE_STATE &&
      !searchWrapper.contains(e.target) &&
      e.target !== searchIcon &&
      !e.target.closest('#suggestion-list') // 추천어 리스트 클릭은 제외
    ) {
      setHeaderSearchClosedState(elements);
    }
  });

  // 초기화 완료 표시
  isHeaderSearchInitialized = true;
  console.log('[header-loader] 검색 이벤트 초기화 완료');

  // 🔥 body 상단 패딩을 헤더 높이만큼 적용하여 컨텐츠 가림 방지
  const headerEl = document.querySelector('.main-header');
  if (!headerEl) {
    console.warn('[header-loader] .main-header 요소를 찾지 못해 패딩/스크롤 제어를 생략합니다.');
    return;
  }

  bindHeaderBodyPadding(headerEl);
  bindHeaderScrollVisibility(headerEl);
}
