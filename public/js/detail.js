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
    const work = place.work;

    const displayName = formatPlaceName(place.real_name, place.fictional_name);

    if (work && displayName) {
      document.title = `${work.title}_${displayName}`;
    }

    const imgEl = document.getElementById('detail-img');
    imgEl.src = place.image;
    imgEl.alt = displayName;

    document.getElementById('detail-name').textContent = displayName;
    
    // 작품명 링크 설정
    const workLink = document.getElementById('detail-work-link');
    const workText = document.getElementById('detail-work');
    if (work && work.id) {
      workLink.href = `work.html?id=${work.id}`;
      workText.textContent = work.title;
      workLink.style.display = 'inline';
    } else {
      workText.textContent = '알 수 없음';
      workLink.style.display = 'none';
    }



    const addrEl = document.getElementById('detail-address');
    addrEl.textContent = place.address;
    addrEl.href = place.mapUrl || '#';
  } catch (err) {
    console.error(err);
    document.getElementById('detail').innerHTML = `<p>${err.message}</p>`;
  }
}


