// public/js/search-results.js
import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { loadGNB } from './gnb-loader.js'; // GNB 로더 추가
import { renderPlaces } from './render-places.js';
import { formatPlaceName } from './utils.js';

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

  // 3. URL에서 검색어(쿼리) 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('query') || '';
  document.getElementById('search-query').textContent = query;

  if (!query) {
    document.getElementById('search-results-list').innerHTML = '<p>검색어를 입력해주세요.</p>';
    return;
  }

  try {
    // 4. 백엔드 API에 검색 요청 (백엔드가 필터링을 모두 처리)
    const res = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('API 응답 오류');
    
    const filteredPlaces = await res.json();

    // 5. 결과 렌더링
    const resultsContainer = document.getElementById('search-results-list');
    if (filteredPlaces.length > 0) {
      // renderPlaces는 #place-list 컨테이너에 렌더링하므로, ID를 임시로 변경
      resultsContainer.id = 'place-list'; 
      renderPlaces(filteredPlaces);
      resultsContainer.id = 'search-results-list'; // 원래 ID로 복구
    } else {
      resultsContainer.innerHTML = '<p>검색 결과가 없습니다.</p>';
    }

  } catch (error) {
    console.error('검색 결과를 불러오는 중 오류 발생:', error);
    document.getElementById('search-results-list').innerHTML = '<p>정보를 불러오는 데 실패했습니다.</p>';
  }
}

document.addEventListener('DOMContentLoaded', init);

