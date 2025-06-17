let allPlaces = [];
let allWorks = [];

Promise.all([
  fetch('data/places.json').then(res => res.json()),
  fetch('data/works.json').then(res => res.json())
])
.then(([places, works]) => {
  allPlaces = places;
  allWorks = works;

  // 기본 작품명 오름차순 정렬
  allPlaces.sort((a, b) => {
    const titleA = allWorks.find(w => w.id === a.workId)?.title || '';
    const titleB = allWorks.find(w => w.id === b.workId)?.title || '';
    return titleA.localeCompare(titleB);
  });

  renderPlaces(allPlaces);
  setupSearchAndSuggest();
})
.catch(err => console.error('데이터 로딩 실패', err));

// ─────────────────────────────
// 검색 + 자동완성
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

  // 엔터 누르면 추천어 숨김(정말 확실하게 처리)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      setTimeout(() => {
        suggList.classList.remove('show');
        // input.blur(); // 필요시 사용
        console.log('엔터로 추천어 닫힘'); // 디버깅 로그
      }, 10); // 0이 아닌 10ms로 약간 늦춰주면 완벽히 동작
    }
  });

  // input에서 submit 발생(모바일의 경우)도 막기
  input.form?.addEventListener('submit', e => e.preventDefault());

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-bar')) suggList.classList.remove('show');
  });
}

// 추천어 리스트
function showSuggestions(query) {
  const suggList = document.getElementById('suggestion-list');
  suggList.innerHTML = '';
  if (!query) {
    suggList.classList.remove('show');
    return;
  }

  const suggestions = [];
  const uniqSet = new Set();

  // 장소명
  allPlaces.forEach(place => {
    if (place.name.toLowerCase().includes(query) && !uniqSet.has(place.name)) {
      suggestions.push({ type: 'place', label: place.name });
      uniqSet.add(place.name);
    }
  });
  // 작품명
  allWorks.forEach(work => {
    if (work.title.toLowerCase().includes(query) && !uniqSet.has(work.title)) {
      suggestions.push({ type: 'work', label: work.title });
      uniqSet.add(work.title);
    }
  });
  // 주소
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
      e.preventDefault(); // focus 유지
      document.getElementById('search-input').value = sugg.label;
      suggList.classList.remove('show');
      updateList();
    });
    suggList.appendChild(li);
  });

  suggList.classList.add('show');
}

// 검색 결과 필터 및 리스트
function updateList() {
  const query = document.getElementById('search-input').value.trim().toLowerCase();

  const filtered = allPlaces.filter(place => {
    const work = allWorks.find(w => w.id === place.workId);
    const nameMatch = place.name.toLowerCase().includes(query);
    const workMatch = work && work.title.toLowerCase().includes(query);
    const addrMatch = place.address.toLowerCase().includes(query);
    return nameMatch || workMatch || addrMatch;
  });

  // 작품명 기준 오름차순 정렬
  filtered.sort((a, b) => {
    const titleA = allWorks.find(w => w.id === a.workId)?.title || '';
    const titleB = allWorks.find(w => w.id === b.workId)?.title || '';
    return titleA.localeCompare(titleB);
  });

  renderPlaces(filtered);
}

// 카드 렌더링
function renderPlaces(places) {
  const container = document.getElementById('place-list');
  container.innerHTML = '';

  places.forEach(place => {
    const work = allWorks.find(w => w.id === place.workId);
    const card = document.createElement('a');
    card.href = `place.html?id=${place.id}`;
    card.className = 'place-card';
    card.innerHTML = `
      <img src="${place.image}" alt="${place.name}" class="place-img" />
      <div class="place-info">
        <div class="place-name">${place.name}</div>
        <div class="work-name">${work?.title || ''}</div>
        <div class="place-address" title="${place.address}">${place.address}</div>
      </div>
    `;
    container.appendChild(card);
  });
}
