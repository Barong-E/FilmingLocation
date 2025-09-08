import { loadHeader, setupHeaderSearch } from './header-loader.js';

// 기본 포스터 이미지 URL 생성
function getDefaultPosterImage(title) {
  // 제목의 첫 글자를 사용해서 기본 이미지 생성
  const firstChar = title.charAt(0);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const color = colors[title.length % colors.length];
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="300" height="450" xmlns="http://www.w3.org/2000/svg">
      <rect width="300" height="450" fill="${color}"/>
      <text x="150" y="225" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle">${firstChar}</text>
    </svg>
  `)}`;
}

const id = new URLSearchParams(window.location.search).get('id');
const $ = s => document.querySelector(s);

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setupHeaderSearch();

  const res = await fetch(`/api/works/${id}`);
  const w = await res.json();
  if (!w || !w.id) {
    $('#work-detail').innerHTML = '<p>작품을 찾을 수 없습니다.</p>';
    return;
  }

  // 포스터 이미지 처리
  const posterImage = $('#work-poster');
  if (posterImage) {
    if (w.image) {
      posterImage.src = w.image;
      posterImage.alt = `${w.title} 포스터`;
      
                                 // 이미지 로드 후 비율 자동 조정
              posterImage.onload = function() {
                this.style.width = '100%';
                this.style.height = 'auto';
              };
      
                                       posterImage.onerror = () => {
                posterImage.src = getDefaultPosterImage(w.title);
                posterImage.classList.add('default');
                posterImage.style.width = '100%';
                posterImage.style.height = 'auto';
              };
                   } else {
          posterImage.src = getDefaultPosterImage(w.title);
          posterImage.classList.add('default');
          posterImage.style.width = '100%';
          posterImage.style.height = 'auto';
        }
  }

  document.title = w.title;
  $('#work-title').textContent   = w.title;
  $('#work-type').textContent    = w.type || '';
  $('#work-release').textContent = w.releaseDate || '';
  $('#work-desc').textContent    = w.description || '';
  
  const charsContainer = $('#work-chars');
  charsContainer.innerHTML = '';
  
  // 디버깅: 실제 데이터 구조 확인
  if (w.characters && w.characterIds && w.characterIds.length > 0) {
    console.log('Characters:', w.characters);
    console.log('Character IDs:', w.characterIds);
    console.log('First character object:', w.characterIds[0]);
  }

  if (w.characters && w.characters.length > 0) {
    w.characters.forEach((characterName, index) => {
      // 개별 인물 처리
      const realName = characterName.split('(')[0].trim();
      const characterInfo = (w.characterIds || []).find(c => 
        c.name === realName || 
        c.id === realName ||
        c._id === realName
      );
      
      if (characterInfo) {
        const roleName = characterName.match(/\(([^)]+)\)/);
        const link = document.createElement('a');
        link.href = `character?id=${characterInfo.id || characterInfo._id}`;
        link.textContent = realName;
        link.className = 'character-link';
        charsContainer.appendChild(link);
        if (roleName) charsContainer.append(`(${roleName[1]})`);
      } else {
        charsContainer.append(characterName);
      }
      
      // 인물 사이에 쉼표 추가 (마지막 인물 제외)
      if (index < w.characters.length - 1) charsContainer.append(', ');
    });
  } else {
    charsContainer.textContent = (w.characters || []).join(', ');
  }

  const placesContainer = $('#work-places');
  if (placesContainer && w.placeIds && w.placeIds.length > 0) {
    placesContainer.innerHTML = '';
    w.placeIds.forEach((place, index) => {
      const link = document.createElement('a');
      link.href = `place?id=${place._id}`;
      link.textContent = place.real_name || place.fictional_name;
      placesContainer.appendChild(link);
      if (index < w.placeIds.length - 1) placesContainer.append(', ');
    });
  }
});









