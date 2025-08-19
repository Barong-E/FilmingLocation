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
});


