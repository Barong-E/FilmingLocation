// 홈페이지 전용 스크립트
import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { loadGNB } from './gnb-loader.js';

const HOME_SEARCH_TRIGGER_ID = 'home-search-trigger';
const HEADER_SEARCH_ICON_ID = 'search-icon';
const KEYWORD_CHIP_SELECTOR = '.keyword-chip';
const KEYWORDS_ROW_SELECTOR = '.keywords-row';
const SEARCH_QUERY_PARAM = 'q';
const POPULAR_KEYWORDS_ENDPOINT = '/api/search/popular?limit=8';
const HEADER_OPEN_DELAY_MS = 100;
const SCROLL_TOP = 0;
const FALLBACK_POPULAR_KEYWORDS = ['이태원', '박서준', '권나라', '유재명'];

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
  const keywordsRowElement = document.querySelector(KEYWORDS_ROW_SELECTOR);
  if (!keywordsRowElement) return;

  keywordsRowElement.addEventListener('click', (event) => {
    const keywordChipElement = event.target.closest(KEYWORD_CHIP_SELECTOR);
    if (!keywordChipElement) return;

    const keyword = keywordChipElement.getAttribute('data-keyword') || '';
    navigateToSearch(keyword);
  });
}

/**
 * 인기 검색어를 받아 칩으로 렌더링합니다.
 * @param {string[]} keywords
 */
function renderKeywordChips(keywords) {
  const keywordsRowElement = document.querySelector(KEYWORDS_ROW_SELECTOR);
  if (!keywordsRowElement) return;

  keywordsRowElement.innerHTML = '';
  keywords.forEach((keyword) => {
    const trimmedKeyword = (keyword || '').trim();
    if (!trimmedKeyword) return;

    const keywordChipElement = document.createElement('button');
    keywordChipElement.type = 'button';
    keywordChipElement.className = 'keyword-chip';
    keywordChipElement.setAttribute('data-keyword', trimmedKeyword);
    keywordChipElement.textContent = `#${trimmedKeyword}`;
    keywordsRowElement.appendChild(keywordChipElement);
  });
}

/**
 * 백엔드에서 인기 검색어를 가져옵니다.
 * @returns {Promise<string[]>}
 */
async function fetchPopularKeywords() {
  try {
    const response = await fetch(POPULAR_KEYWORDS_ENDPOINT);
    if (!response.ok) {
      throw new Error(`인기 검색어 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.keywords) || data.keywords.length === 0) {
      return FALLBACK_POPULAR_KEYWORDS;
    }

    return data.keywords;
  } catch (error) {
    console.warn('[home.js] 인기 검색어 조회 실패, fallback 사용:', error);
    return FALLBACK_POPULAR_KEYWORDS;
  }
}

async function initializeHomePage() {
  await loadHeader();
  loadGNB();
  setupHeaderSearch();
  bindHomeSearchTrigger();
  const popularKeywords = await fetchPopularKeywords();
  renderKeywordChips(popularKeywords);
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
