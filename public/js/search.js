// public/js/search.js
import { renderPlaces } from './render-places.js';

let allPlaces = [];
let isSearchInitialized = false; // 중복 초기화 방지

// 장소명/작품명 병합
function formatPlaceName(realName, fictionalName) {
  return realName || fictionalName || '';
}

// 최근 검색어 유틸
const RECENT_KEY = 'filo_recent_searches';
function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}
function addRecentSearch(keyword) {
  const term = (keyword || '').trim();
  if (!term) return;
  const list = getRecentSearches().filter(k => k.toLowerCase() !== term.toLowerCase());
  list.unshift(term);
  const trimmed = list.slice(0, 8);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(trimmed)); } catch (_) {}
}
function removeRecentSearch(keyword) {
  const term = (keyword || '').trim();
  if (!term) return;
  const list = getRecentSearches().filter(k => k.toLowerCase() !== term.toLowerCase());
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (_) {}
}
function clearRecentSearches() {
  try { localStorage.removeItem(RECENT_KEY); } catch (_) {}
}

// 1️⃣ DOM이 준비된 후 이벤트 연결
function initializeSearch() {
  // 중복 초기화 방지
  if (isSearchInitialized) {
    console.log('[search.js] 이미 초기화됨, 중복 실행 방지');
    return;
  }

  console.log('[search.js] 검색 초기화 시작');
  
  const input = document.getElementById('header-search-input');
  if (!input) {
    console.log('[search.js] header-search-input 요소를 찾을 수 없음, 100ms 후 재시도');
    setTimeout(initializeSearch, 100);
    return;
  }

  // 추천 리스트 요소 준비
  let suggList = document.getElementById('suggestion-list');
  if (!suggList) {
    suggList = document.createElement('ul');
    suggList.id = 'suggestion-list';
    suggList.className = 'suggestion-list';
    input.parentElement.appendChild(suggList);
  }

  // 데이터 로드 (장소 리스트 페이지 초기 렌더)
  fetch('/api/places')
    .then(res => res.json())
    .then(places => {
      allPlaces = places; // 작품 정보가 이미 포함되어 있음

      // 작품명 기준 정렬
      allPlaces.sort((a, b) => {
        // const titleA = works.find(w => w.id === a.workId)?.title || '';
        // const titleB = works.find(w => w.id === b.workId)?.title || '';
        const titleA = a.workInfo?.title || '';
        const titleB = b.workInfo?.title || '';
        return titleA.localeCompare(titleB);
      });

      renderPlaces(allPlaces);
      attachSearchEvents(input, suggList);
      isSearchInitialized = true; // 초기화 완료 표시
      console.log('[search.js] 데이터 로드 + 이벤트 연결 완료');
    })
    .catch(err => console.error('데이터 로드 실패', err));
}

// 2️⃣ 검색 이벤트 연결
function attachSearchEvents(input, suggList) {
  let timeout;
  
  input.addEventListener('input', (e) => {
    // 엔터키는 완전히 무시
    if (e.inputType === 'insertLineBreak' || e.key === 'Enter') {
      return;
    }
    
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      showSuggestions(input.value.trim().toLowerCase(), suggList, input);
      // updateList(input); // places 페이지에서는 실시간 필터링을 하지 않음
    }, 100);
  });

  input.addEventListener('focus', () => {
    showSuggestions(input.value.trim().toLowerCase(), suggList, input);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-search-wrapper')) suggList.classList.remove('show');
  });
}

// 공통: 최근 항목 li 생성 (삭제 버튼은 가장 오른쪽)
function createRecentItemLi(term, suggList, input) {
  const li = document.createElement('li');
  li.style.display = 'flex';
  li.style.alignItems = 'center';
  li.style.justifyContent = 'space-between';

  const left = document.createElement('div');
  left.style.display = 'flex';
  left.style.alignItems = 'center';
  left.innerHTML = `
    <span class="sugg-icon">🕘</span>
    <span class="sugg-label">최근</span>
    <span class="sugg-text">${term}</span>
  `;

  const del = document.createElement('span');
  del.className = 'sugg-delete';
  del.title = '삭제';
  del.textContent = '✕';
  del.style.cssText = 'color:#999; cursor:pointer;';

  // 검색 실행 (li 클릭)
  li.addEventListener('mousedown', (e) => {
    e.preventDefault();
    addRecentSearch(term);
          window.location.href = `/search?q=${encodeURIComponent(term)}`;
  });
  // 삭제 (오른쪽 X 클릭)
  del.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeRecentSearch(term);
    showSuggestions(input.value.trim().toLowerCase(), suggList, input);
  });

  li.appendChild(left);
  li.appendChild(del);
  return li;
}

// 최근 섹션 헤더: "최근 검색어" + "전체삭제"
function appendRecentHeader(suggList, input) {
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
    // 입력이 비어있으면 목록 숨김, 아니면 재렌더
    const q = (document.getElementById('header-search-input')?.value || '').trim().toLowerCase();
    if (!q) {
      suggList.classList.remove('show');
      suggList.innerHTML = '';
    } else {
      showSuggestions(q, suggList, document.getElementById('header-search-input'));
    }
  });
  li.appendChild(left);
  li.appendChild(right);
  suggList.appendChild(li);
}

// 3️⃣ 추천어 표시 (최근 검색어 포함)
async function showSuggestions(query, suggList, input) {
  suggList.innerHTML = '';

  const lowerQuery = (query || '').toLowerCase();
  const recent = getRecentSearches();

  // 입력이 비어 있음
  if (!lowerQuery) {
    if (recent.length === 0) {
      // 최근 검색어도 없으면 아무것도 표시하지 않음
      suggList.classList.remove('show');
      return;
    }
    // 최근 검색어만 노출 + 헤더/전체삭제
    appendRecentHeader(suggList, input);
    recent.slice(0, 8).forEach(term => {
      const li = createRecentItemLi(term, suggList, input);
      suggList.appendChild(li);
    });
    suggList.classList.add('show');
    return;
  }

  // 입력이 있을 때: API 기반 추천어 + 최근 매칭 혼합
  const suggestions = [];
  const uniqSet = new Set();
  const add = (type, label) => {
    const key = `${type}|${label.toLowerCase()}`;
    if (uniqSet.has(key)) return;
    uniqSet.add(key);
    suggestions.push({ type, label });
  };

  // 최근 검색어 먼저 (항상 표시) - 우선순위 정렬: 완전일치 > 접두사 > 부분일치
  const rank = (label) => {
    const l = label.toLowerCase();
    if (l === lowerQuery) return 0;
    if (l.startsWith(lowerQuery)) return 1;
    return 2;
  };
  const recentMatches = recent
    .filter(k => k.toLowerCase().includes(lowerQuery))
    .sort((a, b) => rank(a) - rank(b));
  if (recentMatches.length) {
    appendRecentHeader(suggList, input);
    recentMatches.forEach(term => {
      const li = createRecentItemLi(term, suggList, input);
      suggList.appendChild(li);
    });
  }

  // API에서 추천어 가져오기 (장소/작품/인물 포함)
  try {
    const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(lowerQuery)}`);
    if (res.ok) {
      const data = await res.json();
      const sorted = (data.suggestions || []).slice().sort((a, b) => rank(a.label) - rank(b.label));
      sorted.forEach(s => add(s.type, s.label));
    }
  } catch (_) {}

  if (suggestions.length === 0 && recentMatches.length === 0) {
    suggList.classList.remove('show');
    return;
  }

  // 일반 추천어 렌더 (최근 다음)
  suggestions.slice(0, 12).forEach(sugg => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';

    let icon = '';
    let kind = '';
    if (sugg.type === 'place') { icon = '📍'; kind = '장소'; }
    if (sugg.type === 'work')  { icon = '🎬'; kind = '작품'; }
    if (sugg.type === 'character')  { icon = '👤'; kind = '인물'; }

    left.innerHTML = `
      <span class="sugg-icon">${icon}</span>
      <span class="sugg-label">${kind}</span>
      <span class="sugg-text">${sugg.label}</span>
    `;

    li.appendChild(left);

    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const keyword = sugg.label;
      addRecentSearch(keyword);
      window.location.href = `/search?q=${encodeURIComponent(keyword)}`;
    });

    suggList.appendChild(li);
  });

  suggList.classList.add('show');
}

// 4️⃣ 결과 필터링
function updateList(input) {
  const query = input.value.trim().toLowerCase();

  const filtered = allPlaces.filter(place => {
    // const work = allWorks.find(w => w.id === place.workId);
    const work = place.workInfo; // workInfo 사용
    const combinedName = formatPlaceName(place.real_name, place.fictional_name).toLowerCase();
    const nameMatch = combinedName.includes(query);
    const workMatch = work && work.title.toLowerCase().includes(query);
    const addrMatch = place.address.toLowerCase().includes(query);
    return nameMatch || workMatch || addrMatch;
  });

  filtered.sort((a, b) => {
    // const titleA = allWorks.find(w => w.id === a.workId)?.title || '';
    // const titleB = allWorks.find(w => w.id === b.workId)?.title || '';
    const titleA = a.workInfo?.title || '';
    const titleB = b.workInfo?.title || '';
    return titleA.localeCompare(titleB);
  });

  renderPlaces(filtered);
}

// export for external use
export { initializeSearch, updateList };
