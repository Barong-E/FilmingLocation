import { loadHeader, setupHeaderSearch } from './header-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setupHeaderSearch();

  const res = await fetch('/api/works');
  const works = await res.json();

  const list = document.getElementById('work-list');
  list.innerHTML = '';
  works.forEach(w => {
    const a = document.createElement('a');
    a.href = `work?id=${w.id}`;
    a.className = 'place-card';
    a.innerHTML = `
      <div class="place-info">
        <div class="place-name">${w.title}</div>
        <div class="work-name">${w.type || ''}</div>
        <div class="place-address">${w.releaseDate || ''}</div>
      </div>
    `;
    list.appendChild(a);
  });
});







