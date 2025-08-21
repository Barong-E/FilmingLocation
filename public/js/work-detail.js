import { loadHeader, setupHeaderSearch } from './header-loader.js';

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

  document.title = w.title;
  $('#work-title').textContent   = w.title;
  $('#work-type').textContent    = w.type || '';
  $('#work-release').textContent = w.releaseDate || '';
  $('#work-desc').textContent    = w.description || '';
  
  const charsContainer = $('#work-chars');
  charsContainer.innerHTML = '';
  if (w.characters && w.characters.length > 0) {
    w.characters.forEach((characterName, index) => {
      const realName = characterName.split('(')[0].trim();
      const characterInfo = (w.characterIds || []).find(c => c.name === realName);
      if (characterInfo) {
        const roleName = characterName.match(/\(([^)]+)\)/);
        const link = document.createElement('a');
        link.href = `character?id=${characterInfo.id}`;
        link.textContent = realName;
        charsContainer.appendChild(link);
        if (roleName) charsContainer.append(`(${roleName[1]})`);
      } else {
        charsContainer.append(characterName);
      }
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









