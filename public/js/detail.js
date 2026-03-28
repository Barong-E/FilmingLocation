// public/js/detail.js

import { formatPlaceName } from './utils.js';
import { loadHeader, setupHeaderSearch } from './header-loader.js';

// placeId를 스크립트 스코프에서 한 번만 파싱
const params = new URLSearchParams(window.location.search);
const placeId = params.get('id');

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadHeader();
    setupHeaderSearch();
    renderDetailPage();
  } catch (error) {
    console.error('헤더 로드 실패:', error);
  }
});

async function renderDetailPage() {
  if (!placeId) {
    document.getElementById('detail').innerHTML = '<p>장소 ID가 없습니다.</p>';
    return;
  }
  
  try {
    const res = await fetch(`/api/places/${placeId}`);
    if (!res.ok) throw new Error('장소 정보를 불러오는 데 실패했습니다.');
    
    const place = await res.json();
    const works = place.works || []; // works 배열로 변경

    const displayName = formatPlaceName(place.real_name, place.fictional_name);

    // 페이지 제목 설정 (첫 번째 작품 기준)
    if (works.length > 0 && displayName) {
      document.title = `${works[0].title}_${displayName}`;
    }

    const imgEl = document.getElementById('detail-img');
    imgEl.src = place.image;
    imgEl.alt = displayName;

    document.getElementById('detail-name').textContent = displayName;
    
    // 작품명들 링크 설정 (여러 작품 지원)
    const worksContainer = document.getElementById('detail-works');
    if (works && works.length > 0) {
      worksContainer.innerHTML = works.map((work, index) => {
        const workId = work.id || work._id;
        return `
          <a href="work?id=${workId}" class="work-link">
            ${work.title}
          </a>
          ${index < works.length - 1 ? ', ' : ''}
        `;
      }).join('');
    } else {
      worksContainer.innerHTML = '<span class="no-works">알 수 없음</span>';
    }



    const addrEl = document.getElementById('detail-address');
    addrEl.textContent = place.address;
    addrEl.href = place.mapUrl || '#';
  } catch (err) {
    console.error(err);
    document.getElementById('detail').innerHTML = `<p>${err.message}</p>`;
  }
}


