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
    document.getElementById('detail-work').textContent = work ? work.title : '알 수 없음';

    if (work) {
      document.getElementById('detail-type').textContent = work.type || '';
      document.getElementById('detail-release').textContent = work.releaseDate || '';
      document.getElementById('detail-description').textContent = work.description || '';

      const charsContainer = document.getElementById('detail-characters');
      charsContainer.innerHTML = '';
      if (work.characters && work.characters.length > 0) {
        work.characters.forEach((characterName, index) => {
          const realName = characterName.split('(')[0].trim();
          const characterInfo = (work.characterIds || []).find(c => c.name === realName);
          if (characterInfo) {
            const roleName = characterName.match(/\(([^)]+)\)/);
            const link = document.createElement('a');
            link.href = `character.html?id=${characterInfo.id}`;
            link.textContent = realName;
            charsContainer.appendChild(link);
            if (roleName) charsContainer.append(`(${roleName[1]})`);
          } else {
            charsContainer.append(characterName);
          }
          if (index < work.characters.length - 1) charsContainer.append(', ');
        });
      }
    }

    const addrEl = document.getElementById('detail-address');
    addrEl.textContent = place.address;
    addrEl.href = place.mapUrl || '#';
  } catch (err) {
    console.error(err);
    document.getElementById('detail').innerHTML = `<p>${err.message}</p>`;
  }
}


