// public/js/search-results.js
import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { renderPlaces, setWorks } from './render-places.js';
import { formatPlaceName } from './utils.js';

async function init() {
  // 1. 헤더 렌더링
  await loadHeader();
  setupHeaderSearch();

  // 2. URL에서 검색어(쿼리) 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get('query')?.toLowerCase() || '';
  document.getElementById('search-query').textContent = query;

  if (!query) {
    document.getElementById('search-results-list').innerHTML = '<p>검색어를 입력해주세요.</p>';
    return;
  }

  try {
    // 3. 데이터 로드 및 필터링
    const [works, places] = await Promise.all([
      fetch('/api/works').then(res => res.json()),
      fetch('/api/places').then(res => res.json())
    ]);

    setWorks(works); // render-places 모듈에 작품 데이터 설정

    const filteredPlaces = places.filter(place => {
      const work = works.find(w => w.id === place.workId);
      const combinedName = formatPlaceName(place.real_name, place.fictional_name).toLowerCase();
      const nameMatch = combinedName.includes(query);
      const workMatch = work && work.title.toLowerCase().includes(query);
      const addrMatch = place.address.toLowerCase().includes(query);
      return nameMatch || workMatch || addrMatch;
    });

    // 4. 결과 렌더링
    const resultsContainer = document.getElementById('search-results-list');
    if (filteredPlaces.length > 0) {
      renderPlaces(filteredPlaces);
      // renderPlaces는 #place-list를 찾으므로, id를 임시로 변경
      resultsContainer.id = 'place-list'; 
      renderPlaces(filteredPlaces);
      resultsContainer.id = 'search-results-list'; // 원래 id로 복구
    } else {
      resultsContainer.innerHTML = '<p>검색 결과가 없습니다.</p>';
    }

  } catch (error) {
    console.error('검색 결과를 불러오는 중 오류 발생:', error);
    document.getElementById('search-results-list').innerHTML = '<p>정보를 불러오는 데 실패했습니다.</p>';
  }
}

document.addEventListener('DOMContentLoaded', init);

