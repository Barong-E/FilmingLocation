import { formatPlaceName } from './utils.js';

let allPlaces = [];
let allWorks = [];

Promise.all([
  fetch('data/places.json').then(res => res.json()),
  fetch('data/works.json').then(res => res.json())
])
.then(([places, works]) => {
  allPlaces = places;
  allWorks = works;

  allPlaces.sort((a, b) => {
    const titleA = allWorks.find(w => w.id === a.workId)?.title || '';
    const titleB = allWorks.find(w => w.id === b.workId)?.title || '';
    return titleA.localeCompare(titleB);
  });

  renderPlaces(allPlaces);
  setupSearchAndSuggest();
})
.catch(err => console.error('데이터 로딩 실패', err));

function setupSearchAndSuggest() {
  const input = document.getElementById('search-input');
  const suggList = document.getElementById('suggestion-list');
  let timeout;

  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      showSuggestions(input.value.trim().toLowerCase());
      updateList();
    }, 100);
  });

  input.addEventListener('focus', () => {
    showSuggestions(input.value.trim().toLowerCase());
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      setTimeout(() => {
        suggList.classList.remove('show');
      }, 10);
    }
  });

  input.form?.addEventListener('submit', e => e.preventDefault());

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) suggList.classList.remove('show');
  });
}

function showSuggestions(query) {
  const suggList = document.getElementById('suggestion-list');
  suggList.innerHTML = '';
  if (!query) {
    suggList.classList.remove('show');
    return;
  }

  const suggestions = [];
  const uniqSet = new Set();

  allPlaces.forEach(place => {
    const combinedName = formatPlaceName(place.real_name, place.fictional_name);
    if (combinedName.toLowerCase().includes(query) && !uniqSet.has(combinedName)) {
      suggestions.push({ type: 'place', label: combinedName });
      uniqSet.add(combinedName);
    }
  });

  allWorks.forEach(work => {
    if (work.title.toLowerCase().includes(query) && !uniqSet.has(work.title)) {
      suggestions.push({ type: 'work', label: work.title });
      uniqSet.add(work.title);
    }
  });

  allPlaces.forEach(place => {
    if (place.address.toLowerCase().includes(query) && !uniqSet.has(place.address)) {
      suggestions.push({ type: 'addr', label: place.address });
      uniqSet.add(place.address);
    }
  });

  if (suggestions.length === 0) {
    suggList.classList.remove('show');
    return;
  }

  suggestions.slice(0, 8).forEach(sugg => {
    const li = document.createElement('li');
    let icon = '';
    let kind = '';
    if (sugg.type === 'place') { icon = '🏠'; kind = '장소'; }
    if (sugg.type === 'work')  { icon = '🎬'; kind = '작품'; }
    if (sugg.type === 'addr')  { icon = '📍'; kind = '주소'; }
    li.innerHTML = `
      <span class="sugg-icon">${icon}</span>
      <span class="sugg-label">${kind}</span>
      <span>${sugg.label}</span>
    `;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.getElementById('search-input').value = sugg.label;
      suggList.classList.remove('show');
      updateList();
    });
    suggList.appendChild(li);
  });

  suggList.classList.add('show');
}

function updateList() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();

  const filtered = allPlaces.filter(place => {
    const work = allWorks.find(w => w.id === place.workId);
    const combinedName = formatPlaceName(place.real_name, place.fictional_name).toLowerCase();
    const nameMatch = combinedName.includes(query);
    const workMatch = work && work.title.toLowerCase().includes(query);
    const addrMatch = place.address.toLowerCase().includes(query);
    return nameMatch || workMatch || addrMatch;
  });

  filtered.sort((a, b) => {
    const titleA = allWorks.find(w => w.id === a.workId)?.title || '';
    const titleB = allWorks.find(w => w.id === b.workId)?.title || '';
    return titleA.localeCompare(titleB);
  });

  renderPlaces(filtered);
}

function renderPlaces(places) {
  const container = document.getElementById('place-list');
  container.innerHTML = '';

  places.forEach(place => {
    const work = allWorks.find(w => w.id === place.workId);
    const displayName = formatPlaceName(place.real_name, place.fictional_name);

    const card = document.createElement('a');
    card.href = `place.html?id=${place.id}`;
    card.className = 'place-card';
    card.innerHTML = `
      <img src="${place.image}" alt="${displayName}" class="place-img" />
      <div class="place-info">
        <div class="place-name">${displayName}</div>
        <div class="work-name">${work?.title || ''}</div>
        <div class="place-address" title="${place.address}">${place.address}</div>
      </div>
    `;
    container.appendChild(card);
  });
}
