// public/js/search-results.js
import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { loadGNB } from './gnb-loader.js';
import { renderPlaces } from './render-places.js';
import { renderWorks } from './works-renderer.js';
import { renderCharacters } from './characters-renderer.js';

async function init() {
  // 1. 헤더 렌더링
  await loadHeader();
  setupHeaderSearch();

  // 2. GNB 로드 추가 (디버깅 로그 포함)
  console.log('🔍 GNB 로드 시작...');
  try {
    await loadGNB();
    console.log('✅ GNB 로드 완료');
    
    // GNB 상태 확인
    const gnbContainer = document.getElementById('app-gnb-container');
    const gnb = gnbContainer?.querySelector('.gnb');
    const tabs = gnb?.querySelectorAll('.gnb-tab');
    
    console.log('📱 GNB 컨테이너:', gnbContainer);
    console.log('🧭 GNB 네비게이션:', gnb);
    console.log('🔘 GNB 탭 개수:', tabs?.length);
    
    if (tabs) {
      tabs.forEach((tab, index) => {
        const icon = tab.querySelector('.gnb-icon');
        const text = tab.querySelector('.gnb-text');
        console.log(`탭 ${index + 1}:`, {
          icon: icon,
          text: text?.textContent,
          href: tab.href
        });
      });
    }
    
  } catch (error) {
    console.error('❌ GNB 로드 실패:', error);
  }

  // 3. URL에서 검색어/탭 타입 파싱 (q, :type)
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || '';
  const pathType = (location.pathname.split('/')[2] || 'places');
  document.getElementById('search-query').textContent = q;

  // 4. 탭 이벤트 바인딩
  setupTabListeners(q);
  // 5. 초기 탭 반영
  switchTab(pathType);
  // 6. 카운트 로드
  await loadCounts(q);
  // 7. 현재 탭 데이터 로드
  await loadResults(pathType, q);
}

document.addEventListener('DOMContentLoaded', init);

// 탭 리스너
function setupTabListeners(q) {
  const tabButtons = document.querySelectorAll('.search-tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      switchTab(type);
      updateURL(type, q);
      loadResults(type, q);
    });
  });

  window.onpopstate = () => {
    const type = (location.pathname.split('/')[2] || 'places');
    switchTab(type);
    loadResults(type, q);
    loadCounts(q);
  };
}

// URL 동기화
function updateURL(type, q) {
  const url = `/search/${type}?q=${encodeURIComponent(q)}`;
  history.pushState({ type, q }, '', url);
}

// 공통 빈 상태 렌더러
function renderEmpty(container, message = '해당 조건의 결과가 없습니다') {
  container.innerHTML = `<p class="empty-state">${message}</p>`;
}

// 간단한 검색어 유효성 검사 (프론트 보호)
function isInvalidQuery(q) {
  if (!q) return true;
  const trimmed = q.trim();
  if (trimmed.length < 2) return true;
  // 한글/영문/숫자 중 하나라도 포함되어야 함
  return !/[가-힣a-zA-Z0-9]/.test(trimmed);
}

// 탭 전환
function switchTab(type) {
  const panels = {
    places: document.getElementById('results-places'),
    works: document.getElementById('results-works'),
    characters: document.getElementById('results-characters')
  };
  
  Object.keys(panels).forEach(key => {
    const panel = panels[key];
    const btn = document.querySelector(`.search-tab[data-type="${key}"]`);
    
    // 🚨 안전성 검사 추가: DOM 요소 존재 확인
    if (!panel || !btn) {
      console.warn(`⚠️ switchTab: ${key} 요소를 찾을 수 없습니다`);
      return;
    }
    
    if (key === type) {
      panel.hidden = false;
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
    } else {
      panel.hidden = true;
      panel.innerHTML = '';
      btn.classList.remove('active');
      btn.setAttribute('aria-selected', 'false');
    }
  });
}

// 카운트 로드
async function loadCounts(q) {
  try {
    if (isInvalidQuery(q)) {
      const countPlaces = document.getElementById('count-places');
      const countWorks = document.getElementById('count-works');
      const countCharacters = document.getElementById('count-characters');
      if (countPlaces) countPlaces.textContent = '0';
      if (countWorks) countWorks.textContent = '0';
      if (countCharacters) countCharacters.textContent = '0';
      return;
    }

    const res = await fetch(`/api/search/counts?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    
    // 🚨 안전성 검사 추가: DOM 요소 존재 확인
    const countPlaces = document.getElementById('count-places');
    const countWorks = document.getElementById('count-works');
    const countCharacters = document.getElementById('count-characters');
    
    if (countPlaces) countPlaces.textContent = data.places || 0;
    if (countWorks) countWorks.textContent = data.works || 0;
    if (countCharacters) countCharacters.textContent = data.characters || 0;
    
  } catch (e) {
    console.error('counts load error', e);
    
    // 🚨 안전성 검사 추가: DOM 요소 존재 확인
    const countPlaces = document.getElementById('count-places');
    const countWorks = document.getElementById('count-works');
    const countCharacters = document.getElementById('count-characters');
    
    if (countPlaces) countPlaces.textContent = '0';
    if (countWorks) countWorks.textContent = '0';
    if (countCharacters) countCharacters.textContent = '0';
  }
}

// 결과 로드
async function loadResults(type, q) {
  const containerMap = {
    places: document.getElementById('results-places'),
    works: document.getElementById('results-works'),
    characters: document.getElementById('results-characters')
  };
  const container = containerMap[type];
  
  // 🚨 안전성 검사 추가: 컨테이너 존재 확인
  if (!container) {
    console.error(`❌ loadResults: ${type} 컨테이너를 찾을 수 없습니다`);
    return;
  }

  // 유효하지 않은 검색어는 API 호출하지 않고 빈 메시지 표시
  if (isInvalidQuery(q)) {
    renderEmpty(container);
    return;
  }
  
  container.innerHTML = '<div class="skeleton">로딩 중...</div>';

  try {
    const res = await fetch(`/api/search/${type}?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('API error');
    const response = await res.json();
    
    // 🚨 API 응답 구조 처리: { data: [...] } 또는 직접 배열
    const items = response.data || response || [];
    
    // 🚨 안전성 검사: 배열인지 확인
    if (!Array.isArray(items)) {
      console.error(`❌ loadResults: ${type} API가 배열을 반환하지 않았습니다:`, response);
      renderEmpty(container, '정보를 불러오는 데 실패했습니다.');
      return;
    }

    if (type === 'places') {
      // renderPlaces는 #place-list를 기대 → 임시로 id 스왑
      container.id = 'place-list';
      renderPlaces(items, q); // 🎨 검색어 전달
      container.id = 'results-places';
    }
    if (type === 'works') {
      renderWorks(items, 'results-works', q); // 🎨 검색어 전달
    }
    if (type === 'characters') {
      renderCharacters(items, 'results-characters', q); // 🎨 검색어 전달
    }

    if (!items || items.length === 0) {
      renderEmpty(container);
    }
  } catch (e) {
    console.error('loadResults error', e);
    renderEmpty(container, '정보를 불러오는 데 실패했습니다.');
  }
}

