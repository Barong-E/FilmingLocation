// public/js/search.js
import { renderPlaces } from './render-places.js';
import { highlightText } from './highlight-utils.js';

const RECENT_SEARCH_STORAGE_KEY = 'filo_recent_searches';
const MAX_RECENT_SEARCHES = 8;
const MAX_SUGGESTIONS = 12;
const INPUT_DEBOUNCE_MS = 100;
const RETRY_INITIALIZE_MS = 100;
const SEARCH_WRAPPER_SELECTOR = '.header-search-wrapper';
const HEADER_SEARCH_INPUT_ID = 'header-search-input';
const SUGGESTION_LIST_ID = 'suggestion-list';
const SUGGESTION_LIST_CLASS = 'suggestion-list';
const PLACE_API_PATH = '/api/places';

/** @type {Array<Object>} */
let allPlaces = [];
let isSearchInitialized = false;

function formatPlaceName(realName, fictionalName) {
  return realName || fictionalName || '';
}

function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('[search.js] 최근 검색어 조회 실패:', error);
    return [];
  }
}

function setRecentSearches(searches) {
  try {
    localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(searches));
  } catch (error) {
    console.warn('[search.js] 최근 검색어 저장 실패:', error);
  }
}

function addRecentSearch(keyword) {
  const term = (keyword || '').trim();
  if (!term) return;

  const deduplicatedSearches = getRecentSearches().filter(
    (searchTerm) => searchTerm.toLowerCase() !== term.toLowerCase()
  );
  deduplicatedSearches.unshift(term);
  setRecentSearches(deduplicatedSearches.slice(0, MAX_RECENT_SEARCHES));
}

function removeRecentSearch(keyword) {
  const term = (keyword || '').trim();
  if (!term) return;

  const filteredSearches = getRecentSearches().filter(
    (searchTerm) => searchTerm.toLowerCase() !== term.toLowerCase()
  );
  setRecentSearches(filteredSearches);
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCH_STORAGE_KEY);
  } catch (error) {
    console.warn('[search.js] 최근 검색어 초기화 실패:', error);
  }
}

function navigateToSearch(keyword) {
  const trimmedKeyword = (keyword || '').trim();
  if (!trimmedKeyword) return;

  addRecentSearch(trimmedKeyword);
  window.location.href = `/search?q=${encodeURIComponent(trimmedKeyword)}`;
}

function getSearchInputElement() {
  return document.getElementById(HEADER_SEARCH_INPUT_ID);
}

/**
 * @param {HTMLInputElement} inputElement
 * @returns {HTMLUListElement}
 */
function ensureSuggestionListElement(inputElement) {
  let suggestionListElement = document.getElementById(SUGGESTION_LIST_ID);
  if (!suggestionListElement) {
    suggestionListElement = document.createElement('ul');
    suggestionListElement.id = SUGGESTION_LIST_ID;
    suggestionListElement.className = SUGGESTION_LIST_CLASS;
    inputElement.parentElement.appendChild(suggestionListElement);
  }

  return suggestionListElement;
}

function sortPlacesByWorkTitle(places) {
  places.sort((placeA, placeB) => {
    const titleA = placeA.workInfo?.title || '';
    const titleB = placeB.workInfo?.title || '';
    return titleA.localeCompare(titleB);
  });
}

async function fetchPlaceList() {
  const response = await fetch(PLACE_API_PATH);
  if (!response.ok) {
    throw new Error(`장소 목록 요청 실패: ${response.status}`);
  }

  const places = await response.json();
  sortPlacesByWorkTitle(places);
  return places;
}

async function initializeSearch() {
  if (isSearchInitialized) {
    console.log('[search.js] 이미 초기화됨, 중복 실행 방지');
    return;
  }

  console.log('[search.js] 검색 초기화 시작');

  const headerSearchInputElement = getSearchInputElement();
  if (!headerSearchInputElement) {
    console.log(`[search.js] ${HEADER_SEARCH_INPUT_ID} 요소를 찾을 수 없음, ${RETRY_INITIALIZE_MS}ms 후 재시도`);
    setTimeout(initializeSearch, RETRY_INITIALIZE_MS);
    return;
  }

  const suggestionListElement = ensureSuggestionListElement(headerSearchInputElement);

  try {
    allPlaces = await fetchPlaceList();
    renderPlaces(allPlaces);
    attachSearchEvents(headerSearchInputElement, suggestionListElement);
    isSearchInitialized = true;
    console.log('[search.js] 데이터 로드 + 이벤트 연결 완료');
  } catch (error) {
    console.error('데이터 로드 실패', error);
  }
}

function attachSearchEvents(inputElement, suggestionListElement) {
  let inputDebounceTimer;

  inputElement.addEventListener('input', (event) => {
    if (event.inputType === 'insertLineBreak' || event.key === 'Enter') {
      return;
    }

    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
      showSuggestions(inputElement.value.trim().toLowerCase(), suggestionListElement, inputElement);
    }, INPUT_DEBOUNCE_MS);
  });

  inputElement.addEventListener('focus', () => {
    showSuggestions(inputElement.value.trim().toLowerCase(), suggestionListElement, inputElement);
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest(SEARCH_WRAPPER_SELECTOR)) {
      suggestionListElement.classList.remove('show');
    }
  });
}

function createRecentItemLi(term, suggestionListElement, inputElement) {
  const li = document.createElement('li');
  li.style.display = 'flex';
  li.style.alignItems = 'center';
  li.style.justifyContent = 'space-between';

  const left = document.createElement('div');
  left.style.display = 'flex';
  left.style.alignItems = 'center';
  
  const currentQuery = inputElement.value.trim();
  const highlightedTerm = currentQuery ? highlightText(term, currentQuery) : term;
  
  left.innerHTML = `
    <span class="sugg-icon">🕘</span>
    <span class="sugg-label">최근</span>
    <span class="sugg-text">${highlightedTerm}</span>
  `;

  const del = document.createElement('span');
  del.className = 'sugg-delete';
  del.title = '삭제';
  del.textContent = '✕';
  del.style.cssText = 'color:#999; cursor:pointer;';

  li.addEventListener('mousedown', (e) => {
    e.preventDefault();
    navigateToSearch(term);
  });

  del.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeRecentSearch(term);
    showSuggestions(inputElement.value.trim().toLowerCase(), suggestionListElement, inputElement);
  });

  li.appendChild(left);
  li.appendChild(del);
  return li;
}

function appendRecentHeader(suggestionListElement, inputElement) {
  const li = document.createElement('li');
  li.style.display = 'flex';
  li.style.alignItems = 'center';
  li.style.justifyContent = 'space-between';
  li.style.fontWeight = '600';
  li.style.padding = '6px 8px';
  const left = document.createElement('span');
  left.textContent = '최근 검색어';
  const right = document.createElement('button');
  right.textContent = '전체삭제';
  right.style.cssText = 'border:none;background:none;color:#999;cursor:pointer;';
  right.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearRecentSearches();
    const currentQuery = (inputElement?.value || '').trim().toLowerCase();
    if (!currentQuery) {
      suggestionListElement.classList.remove('show');
      suggestionListElement.innerHTML = '';
    } else {
      showSuggestions(currentQuery, suggestionListElement, inputElement);
    }
  });
  li.appendChild(left);
  li.appendChild(right);
  suggestionListElement.appendChild(li);
}

function getMatchRank(label, lowerQuery) {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel === lowerQuery) return 0;
  if (lowerLabel.startsWith(lowerQuery)) return 1;
  return 2;
}

async function showSuggestions(query, suggestionListElement, inputElement) {
  suggestionListElement.innerHTML = '';

  const lowerQuery = (query || '').toLowerCase();
  const recentSearches = getRecentSearches();

  if (!lowerQuery) {
    if (recentSearches.length === 0) {
      suggestionListElement.classList.remove('show');
      return;
    }

    appendRecentHeader(suggestionListElement, inputElement);
    recentSearches.slice(0, MAX_RECENT_SEARCHES).forEach((term) => {
      const li = createRecentItemLi(term, suggestionListElement, inputElement);
      suggestionListElement.appendChild(li);
    });
    suggestionListElement.classList.add('show');
    return;
  }

  const suggestions = [];
  const uniqueSuggestions = new Set();
  const addSuggestion = (type, label) => {
    const key = `${type}|${label.toLowerCase()}`;
    if (uniqueSuggestions.has(key)) return;
    uniqueSuggestions.add(key);
    suggestions.push({ type, label });
  };

  const recentMatches = recentSearches
    .filter((searchTerm) => searchTerm.toLowerCase().includes(lowerQuery))
    .sort((a, b) => getMatchRank(a, lowerQuery) - getMatchRank(b, lowerQuery));

  if (recentMatches.length) {
    appendRecentHeader(suggestionListElement, inputElement);
    recentMatches.forEach((term) => {
      const li = createRecentItemLi(term, suggestionListElement, inputElement);
      suggestionListElement.appendChild(li);
    });
  }

  try {
    const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(lowerQuery)}`);
    if (res.ok) {
      const data = await res.json();
      const sorted = (data.suggestions || [])
        .slice()
        .sort((a, b) => getMatchRank(a.label, lowerQuery) - getMatchRank(b.label, lowerQuery));
      sorted.forEach((suggestion) => addSuggestion(suggestion.type, suggestion.label));
    }
  } catch (error) {
    console.warn('[search.js] 추천어 조회 실패:', error);
  }

  if (suggestions.length === 0 && recentMatches.length === 0) {
    suggestionListElement.classList.remove('show');
    return;
  }

  suggestions.slice(0, MAX_SUGGESTIONS).forEach((suggestion) => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';

    let icon = '';
    let kind = '';
    if (suggestion.type === 'place') { icon = '📍'; kind = '장소'; }
    if (suggestion.type === 'work') { icon = '🎬'; kind = '작품'; }
    if (suggestion.type === 'character') { icon = '👤'; kind = '인물'; }

    const highlightedLabel = highlightText(suggestion.label, query);
    
    left.innerHTML = `
      <span class="sugg-icon">${icon}</span>
      <span class="sugg-label">${kind}</span>
      <span class="sugg-text">${highlightedLabel}</span>
    `;

    li.appendChild(left);

    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      navigateToSearch(suggestion.label);
    });

    suggestionListElement.appendChild(li);
  });

  suggestionListElement.classList.add('show');
}

function updateList(inputElement) {
  const query = inputElement.value.trim().toLowerCase();

  const filtered = allPlaces.filter((place) => {
    const work = place.workInfo;
    const combinedName = formatPlaceName(place.real_name, place.fictional_name).toLowerCase();
    const nameMatch = combinedName.includes(query);
    const workMatch = work && work.title.toLowerCase().includes(query);
    const addrMatch = place.address.toLowerCase().includes(query);
    return nameMatch || workMatch || addrMatch;
  });

  filtered.sort((a, b) => {
    const titleA = a.workInfo?.title || '';
    const titleB = b.workInfo?.title || '';
    return titleA.localeCompare(titleB);
  });

  renderPlaces(filtered);
}

export { initializeSearch, updateList };
