import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { showToast } from './utils.js';
import { fetchComments, postComment, deleteComment, editComment, renderComments } from './render-comments-utils.js';
import { checkAuth } from './render-places.js';

const id = new URLSearchParams(window.location.search).get('id');
const $ = s => document.querySelector(s);
const COMMENT_LIMIT = 1000;

let currentUserId = null;

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
  // 상단 요약: 국적 + 직업 한 줄
  const nationJob = [c.nationality, c.job].filter(Boolean).join(' ');
  const nationJobEl = document.querySelector('#ch-nation-job');
  if (nationJobEl) nationJobEl.textContent = nationJob;

  // 출생 정보: 신 필드 우선
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

  // 나이: 서버 응답 우선
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

  // 키/몸무게 한 줄
  const parseNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  const h = parseNum(c.heightCm);
  const w = parseNum(c.weightKg);
  const phy = document.querySelector('#ch-physique');
  if (phy) {
    if (h != null && w != null) phy.textContent = `${h}cm, ${w}kg`;
    else if (h != null) phy.textContent = `${h}cm`;
    else if (w != null) phy.textContent = `${w}kg`;
    else phy.textContent = '';
  }

  // 학력/수상/설명 섹션 (값 없으면 행 제거)
  const eduArr = Array.isArray(c.education) ? c.education : (c.education ? [c.education] : []);
  const awardsArr = Array.isArray(c.awards) ? c.awards : (c.awards ? [c.awards] : []);
  const descStr = typeof c.description === 'string' ? c.description.trim() : '';
  const rowEdu = document.querySelector('#row-education');
  const rowAwards = document.querySelector('#row-awards');
  const rowDesc = document.querySelector('#row-description');
  if (eduArr.length) document.querySelector('#edu-value').textContent = eduArr.join('\n'); else rowEdu?.remove();
  if (awardsArr.length) document.querySelector('#awards-value').textContent = awardsArr.join('\n'); else rowAwards?.remove();
  if (descStr) document.querySelector('#desc-value').textContent = descStr; else rowDesc?.remove();

  const user = await checkAuth();
  if (user) { currentUserId = user.id; $('#comment-form').style.display = 'block'; }

  await loadAndRender();

  const input = $('#comment-input');
  const countEl = $('#comment-count');
  const limitEl = $('#comment-limit');
  limitEl.textContent = String(COMMENT_LIMIT);
  const updateCounter = () => { const len = input.value.length; countEl.textContent = String(len); countEl.classList.toggle('limit-exceed', len > COMMENT_LIMIT); };
  input.addEventListener('input', updateCounter);
  input.addEventListener('keydown', (e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); $('#comment-form').requestSubmit(); } });
  updateCounter();

  $('#comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = input.value.trim();
    if (!content) return;
    if (content.length > COMMENT_LIMIT) return showToast('댓글은 1000자까지 입력 가능합니다', 'error');
    try { await postComment('characters', id, content); showToast('댓글이 등록되었어요', 'success'); input.value = ''; await loadAndRender(); }
    catch { showToast('댓글 등록에 실패했어요', 'error'); }
  });
});

async function loadAndRender() {
  const comments = await fetchComments('characters', id);
  renderComments(comments, $('#comment-list'), currentUserId);

  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.id;
      try { await deleteComment('characters', id, cid); showToast('댓글이 삭제되었어요', 'success'); await loadAndRender(); }
      catch { showToast('댓글 삭제에 실패했어요', 'error'); }
    });
  });

  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.id;
      const card = btn.closest('.comment-card');
      const p = card.querySelector('.comment-content');
      const text = p.textContent.replace(/\(수정됨\)\s*$/, '').trimEnd();
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'width:100%;min-height:80px;box-sizing:border-box;padding:10px 12px;border:1px solid #ddd;border-radius:8px;';
      p.replaceWith(textarea);
      btn.style.display = 'none';
      const saveBtn = document.createElement('button');
      saveBtn.textContent = '저장';
      saveBtn.className = 'btn-main';
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '취소';
      cancelBtn.className = 'btn-delete';
      btn.insertAdjacentElement('afterend', saveBtn);
      saveBtn.insertAdjacentElement('afterend', cancelBtn);
      const exit = () => { const back = document.createElement('p'); back.className='comment-content'; back.textContent = text; textarea.replaceWith(back); saveBtn.remove(); cancelBtn.remove(); btn.style.display=''; };
      cancelBtn.addEventListener('click', (e)=>{e.preventDefault(); exit();});
      textarea.addEventListener('keydown', (e)=>{ if(e.key==='Escape') exit(); });
      saveBtn.addEventListener('click', async ()=>{
        const content = textarea.value.trim();
        if (!content) return showToast('내용을 입력하세요', 'error');
        if (content.length > COMMENT_LIMIT) return showToast('댓글은 1000자까지 입력 가능합니다', 'error');
        try { await editComment('characters', id, cid, content); showToast('댓글이 수정되었어요', 'success'); await loadAndRender(); }
        catch { showToast('댓글 수정에 실패했어요', 'error'); }
      });
    });
  });

  document.querySelectorAll('.btn-like').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.id;
      const res = await fetch(`/api/characters/${id}/comments/${cid}/like`, { method:'POST', credentials:'include' });
      if (res.ok) { const data = await res.json(); const card = btn.closest('.comment-card'); card.querySelector('.like-count').textContent = data.likes; card.querySelector('.dislike-count').textContent = data.dislikes; btn.classList.add('active'); card.querySelector('.btn-dislike')?.classList.remove('active'); }
    });
  });
  document.querySelectorAll('.btn-dislike').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.id;
      const res = await fetch(`/api/characters/${id}/comments/${cid}/dislike`, { method:'POST', credentials:'include' });
      if (res.ok) { const data = await res.json(); const card = btn.closest('.comment-card'); card.querySelector('.like-count').textContent = data.likes; card.querySelector('.dislike-count').textContent = data.dislikes; btn.classList.add('active'); card.querySelector('.btn-like')?.classList.remove('active'); }
    });
  });
}


