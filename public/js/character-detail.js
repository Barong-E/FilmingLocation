import { loadHeader, setupHeaderSearch } from './header-loader.js';

const id = new URLSearchParams(window.location.search).get('id');
const $ = s => document.querySelector(s);

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setupHeaderSearch();

  const res = await fetch(`/api/characters/${id}`);
  const c = await res.json();
  if (!c || !c.id) {
    $('#character-detail').innerHTML = '<p>등장인물을 찾을 수 없습니다.</p>';
    return;
  }

  document.title = c.name;
  $('#ch-image').src        = c.image || '';
  $('#ch-image').alt        = c.name || '';
  $('#ch-name').textContent = c.name || '';

  const nationJob = [c.nationality, c.job].filter(Boolean).join(' ');
  const nationJobEl = document.querySelector('#ch-nation-job');
  if (nationJobEl) nationJobEl.textContent = nationJob;

  let birthdate = c.birthDate || '';
  let birthplace = c.birthPlace || '';
  if ((!birthdate || !birthplace) && c.birth) {
    const parts = c.birth.split(',');
    const first = (parts[0] || '').trim();
    if (!birthdate) {
      const m = first.match(/(\d{4}-\d{2}-\d{2})/);
      if (m) birthdate = m[1];
    }
    if (!birthplace) birthplace = (parts[1] || '').trim();
  }

  let age = c.age || '';
  if (!age && /^\d{4}-\d{2}-\d{2}$/.test(birthdate)) {
    const [yy, mm, dd] = birthdate.split('-').map(Number);
    const today = new Date();
    let a = today.getFullYear() - yy;
    const had = (today.getMonth() > mm - 1) || (today.getMonth() === mm - 1 && today.getDate() >= dd);
    if (!had) a -= 1;
    age = `만 ${a}세`;
  }

  const bdEl = document.querySelector('#ch-birthdate');
  const ageEl = document.querySelector('#ch-age');
  const bpEl = document.querySelector('#ch-birthplace');
  if (bdEl) bdEl.textContent = birthdate;
  if (ageEl) ageEl.textContent = age;
  if (bpEl) bpEl.textContent = birthplace ? `${birthplace} 출생` : '';

  const parseNum = (v) => { 
    // null, undefined, 빈 문자열 체크를 먼저 수행
    if (v === null || v === undefined || v === '') return null;
    
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const h = parseNum(c.heightCm);
  const w = parseNum(c.weightKg);
  const phy = document.querySelector('#ch-physique');
  if (phy) {
    if (h != null && w != null) phy.textContent = `${h}cm, ${w}kg`;
    else if (h != null) phy.textContent = `${h}cm`;
    else if (w != null) phy.textContent = `${w}kg`;
    else phy.textContent = '';
  }

  const eduArr = Array.isArray(c.education) ? c.education : (c.education ? [c.education] : []);
  const descStr = typeof c.description === 'string' ? c.description.trim() : '';
  const rowEdu = document.querySelector('#row-education');
  const rowDesc = document.querySelector('#row-description');
  if (eduArr.length) document.querySelector('#edu-value').textContent = eduArr.join('\n'); else rowEdu?.remove();
  if (descStr) document.querySelector('#desc-value').textContent = descStr; else rowDesc?.remove();

  // 인물이 출현한 작품들 가져오기
  await loadCharacterWorks(c.id);
});

// 인물이 출현한 작품들을 가져와서 표시하는 함수
async function loadCharacterWorks(characterId) {
  try {
    console.log(`🔍 Loading works for character: ${characterId}`);
    
    const res = await fetch(`/api/characters/${characterId}/works`);
    const works = await res.json();
    
    console.log(`📺 Found ${works.length} works:`, works);
    
    const worksContainer = document.querySelector('#works-container');
    const rowWorks = document.querySelector('#row-works');
    
    if (!works || works.length === 0) {
      console.log('❌ No works found, hiding works section');
      // 작품이 없으면 "작품" 섹션 자체를 숨김
      rowWorks?.remove();
      return;
    }
    
    console.log(`✅ Displaying ${works.length} works`);
    
    // 작품들을 카드 형태로 표시
    worksContainer.innerHTML = '';
    works.forEach((work, index) => {
      console.log(`🎬 Creating card for work ${index + 1}:`, work);
      const workCard = createWorkCard(work);
      worksContainer.appendChild(workCard);
    });
    
  } catch (error) {
    console.error('❌ Error loading character works:', error);
    // 에러가 발생해도 "작품" 섹션은 유지하되, 에러 메시지 표시
    const worksContainer = document.querySelector('#works-container');
    if (worksContainer) {
      worksContainer.innerHTML = '<div class="no-works">작품 정보를 불러오는 중 오류가 발생했습니다.</div>';
    }
  }
}

// 작품 카드를 생성하는 함수
function createWorkCard(work) {
  const card = document.createElement('a');
  card.href = `work?id=${work.id}`;
  card.className = 'work-card';
  
  // 작품 이미지 (기본 이미지가 있으면 사용, 없으면 제목 첫 글자로 생성)
  const image = document.createElement('img');
  if (work.image) {
    image.src = work.image;
    image.alt = `${work.title} 포스터`;
  } else {
    // 기본 이미지 생성 (work-detail.js와 동일한 로직)
    image.src = getDefaultWorkImage(work.title);
    image.alt = `${work.title} 기본 이미지`;
  }
  image.className = 'work-card-image';
  
  // 작품 정보
  const info = document.createElement('div');
  info.className = 'work-card-info';
  
  const title = document.createElement('div');
  title.className = 'work-card-title';
  title.textContent = work.title;
  
  const meta = document.createElement('div');
  meta.className = 'work-card-meta';
  const metaText = [work.type, work.releaseDate].filter(Boolean).join(' • ');
  meta.textContent = metaText;
  
  info.appendChild(title);
  info.appendChild(meta);
  
  card.appendChild(image);
  card.appendChild(info);
  
  return card;
}

// 기본 작품 이미지 생성 함수 (work-detail.js와 동일)
function getDefaultWorkImage(title) {
  const firstChar = title.charAt(0);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const color = colors[title.length % colors.length];
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="140" height="180" xmlns="http://www.w3.org/2000/svg">
      <rect width="140" height="180" fill="${color}"/>
      <text x="70" y="90" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle">${firstChar}</text>
    </svg>
  `)}`;
}


