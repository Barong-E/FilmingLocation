// public/js/characters-renderer.js
import { highlightText, smartTruncate } from './highlight-utils.js';

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}
function getDefaultProfileImage(name) {
  const firstChar = name.charAt(0);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const color = colors[name.length % colors.length];
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${color}"/>
      <text x="100" y="120" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle">${firstChar}</text>
    </svg>
  `)}`;
}

export function renderCharacters(list, root, searchQuery = '') {
  const el = typeof root === 'string' ? document.getElementById(root) : (root || document.getElementById('character-list'));
  if (!el) return;
  el.innerHTML = '';

  if (!Array.isArray(list) || list.length === 0) {
    el.innerHTML = '<p class="comment-empty">인물 검색 결과가 없습니다.</p>';
    return;
  }

  const gridContainer = document.createElement('div');
  gridContainer.className = 'character-grid';

  list.forEach(character => {
    const age = calculateAge(character.birthDate);
    const formattedBirth = formatDate(character.birthDate);

    const card = document.createElement('a');
    card.href = `/character?id=${character.id}`;
    card.className = 'character-card';

    const imageUrl = character.image || getDefaultProfileImage(character.name);

    // 🎨 검색어 하이라이팅 적용
    const highlightedName = searchQuery ? highlightText(character.name, searchQuery) : character.name;
    const highlightedJob = searchQuery ? highlightText(character.job || '', searchQuery) : (character.job || '');
    const highlightedNationality = searchQuery ? highlightText(character.nationality || '', searchQuery) : (character.nationality || '');

    card.innerHTML = `
      <div class="character-image-container">
        <img class="character-image" src="${imageUrl}" alt="${character.name} 프로필 이미지" loading="lazy" onerror="this.src='${getDefaultProfileImage(character.name)}'" />
      </div>
      <div class="character-info">
        <div class="character-name-row">
          <span class="character-name">${highlightedName}</span>
          ${character.job ? `<span class="character-subtitle">${highlightedJob}</span>` : ''}
        </div>
        ${formattedBirth ? `
          <div class="character-birth-row">
            <span class="character-birth">${formattedBirth}</span>
            ${age !== null ? `<span class="character-age">(${age}세)</span>` : ''}
          </div>
        ` : ''}
        ${character.nationality && searchQuery ? `
          <div class="character-nationality">
            <span>${highlightedNationality}</span>
          </div>
        ` : ''}
      </div>
    `;

    gridContainer.appendChild(card);
  });

  el.appendChild(gridContainer);
}
