import { loadHeader, setupHeaderSearch } from './header-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setupHeaderSearch();

  const res = await fetch('/api/characters');
  const list = await res.json();

  const el = document.getElementById('character-list');
  el.innerHTML = '';
  if (!Array.isArray(list) || list.length === 0) {
    el.innerHTML = '<p class="comment-empty">등장인물이 없습니다.</p>';
    return;
  }
  list.forEach(c => {
    const a = document.createElement('a');
    a.href = `character?id=${c.id}`;
    a.className = 'place-card';
    a.innerHTML = `
      <div class="place-info">
        <div class="place-name">${c.name}</div>
        <div class="work-name">${c.job || c.nationality || ''}</div>
      </div>
    `;
    el.appendChild(a);
  });
});


