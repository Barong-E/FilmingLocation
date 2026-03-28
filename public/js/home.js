// 홈페이지 전용 스크립트
import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { loadGNB } from './gnb-loader.js';

const HOME_SEARCH_TRIGGER_ID = 'home-search-trigger';
const HEADER_SEARCH_ICON_ID = 'search-icon';
const KEYWORD_CHIP_SELECTOR = '.keyword-chip';
const SEARCH_QUERY_PARAM = 'q';
const HEADER_OPEN_DELAY_MS = 100;
const SCROLL_TOP = 0;

/**
 * 키워드를 검색 페이지로 이동시킵니다.
 * @param {string} keyword
 */
function navigateToSearch(keyword) {
  const trimmedKeyword = (keyword || '').trim();
  if (!trimmedKeyword) return;

  window.location.href = `/search?${SEARCH_QUERY_PARAM}=${encodeURIComponent(trimmedKeyword)}`;
}

/**
 * 홈 검색창 클릭 시 헤더 검색창을 엽니다.
 * 기존 UX를 유지하기 위해 스크롤 후 아이콘 클릭 순서를 보장합니다.
 */
function openHeaderSearchFromHome() {
  const headerSearchIcon = document.getElementById(HEADER_SEARCH_ICON_ID);
  if (!headerSearchIcon) return;

  window.scrollTo({ top: SCROLL_TOP, behavior: 'smooth' });
  window.setTimeout(() => {
    headerSearchIcon.click();
  }, HEADER_OPEN_DELAY_MS);
}

/**
 * 중앙 검색 영역 이벤트를 연결합니다.
 */
function bindHomeSearchTrigger() {
  const homeSearchTriggerElement = document.getElementById(HOME_SEARCH_TRIGGER_ID);
  if (!homeSearchTriggerElement) return;

  homeSearchTriggerElement.addEventListener('click', (event) => {
    event.preventDefault();
    openHeaderSearchFromHome();
  });
}

/**
 * 추천 키워드 칩 클릭 이벤트를 연결합니다.
 */
function bindKeywordChipEvents() {
  document.querySelectorAll(KEYWORD_CHIP_SELECTOR).forEach((keywordChipElement) => {
    keywordChipElement.addEventListener('click', () => {
      const keyword = keywordChipElement.getAttribute('data-keyword') || '';
      navigateToSearch(keyword);
    });
  });
}

async function initializeHomePage() {
  await loadHeader();
  loadGNB();
  setupHeaderSearch();
  bindHomeSearchTrigger();
  bindKeywordChipEvents();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeHomePage();
    console.log('🏠 홈페이지 초기화 완료');
  } catch (error) {
    console.error('❌ 홈페이지 초기화 실패:', error);
    window.alert('홈 화면을 불러오는 중 문제가 발생했습니다. 새로고침 후 다시 시도해 주세요.');
  }
});
