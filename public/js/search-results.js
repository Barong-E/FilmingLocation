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
    const res = await fetch(`/api/search/counts?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    document.getElementById('count-places').textContent = data.places || 0;
    document.getElementById('count-works').textContent = data.works || 0;
    document.getElementById('count-characters').textContent = data.characters || 0;
  } catch (e) {
    console.error('counts load error', e);
    document.getElementById('count-places').textContent = '0';
    document.getElementById('count-works').textContent = '0';
    document.getElementById('count-characters').textContent = '0';
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
  if (!container) return;
  container.innerHTML = '<div class="skeleton">로딩 중...</div>';

  try {
    const res = await fetch(`/api/search/${type}?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error('API error');
    const items = await res.json();

    if (type === 'places') {
      // renderPlaces는 #place-list를 기대 → 임시로 id 스왑
      container.id = 'place-list';
      renderPlaces(items);
      container.id = 'results-places';
    }
    if (type === 'works') {
      renderWorks(items, 'results-works');
    }
    if (type === 'characters') {
      renderCharacters(items, 'results-characters');
    }

    if (!items || items.length === 0) {
      container.innerHTML = '<p>해당 조건의 결과가 없습니다</p>';
    }
  } catch (e) {
    console.error('loadResults error', e);
    container.innerHTML = '<p>정보를 불러오는 데 실패했습니다.</p>';
  }
}

