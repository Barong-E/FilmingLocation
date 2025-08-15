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
  // $('#work-chars').textContent   = (w.characters || []).join(', '); // 기존 텍스트 방식
  
  // 등장인물 정보를 링크로 생성
  const charsContainer = $('#work-chars');
  charsContainer.innerHTML = ''; // 초기화

  // w.characters (모든 등장인물) 기준으로 목록 생성
  if (w.characters && w.characters.length > 0) {
    w.characters.forEach((characterName, index) => {
      // "박서준(박새로이)" -> "박서준" 추출
      const realName = characterName.split('(')[0].trim();
      
      // characterIds 배열에서 현재 배우 정보 찾기
      const characterInfo = (w.characterIds || []).find(c => c.name === realName);

      if (characterInfo) {
        // DB에 등록된 인물이면 링크 생성
        const roleName = characterName.match(/\(([^)]+)\)/); // (배역) 부분 추출
        
        const link = document.createElement('a');
        link.href = `character.html?id=${characterInfo.id}`;
        link.textContent = realName; // 배우 이름
        charsContainer.appendChild(link);

        if (roleName) {
          // (배역)이 있으면 뒤에 텍스트로 추가
          charsContainer.append(`(${roleName[1]})`);
        }
      } else {
        // DB에 없으면 일반 텍스트로 추가
        charsContainer.append(characterName);
      }

      // 마지막 인물이 아니면 쉼표 추가
      if (index < w.characters.length - 1) {
        charsContainer.append(', ');
      }
    });
  } else {
    // characterIds 정보가 없으면 기존 방식대로 텍스트만 표시
    charsContainer.textContent = (w.characters || []).join(', ');
  }

  // 촬영지 정보를 링크로 생성
  const placesContainer = $('#work-places');
  if (w.placeIds && w.placeIds.length > 0) {
    placesContainer.innerHTML = '';
    w.placeIds.forEach((place, index) => {
      const link = document.createElement('a');
      link.href = `place.html?id=${place._id}`; // place._id 사용
      link.textContent = place.real_name || place.fictional_name;
      placesContainer.appendChild(link);

      if (index < w.placeIds.length - 1) {
        placesContainer.append(', ');
      }
    });
  }


  const user = await checkAuth();
  if (user) {
    currentUserId = user.id;
    $('#comment-form').style.display = 'block';
  }

  await loadAndRender();

  const input = $('#comment-input');
  const countEl = $('#comment-count');
  const limitEl = $('#comment-limit');
  limitEl.textContent = String(COMMENT_LIMIT);
  const updateCounter = () => {
    const len = input.value.length;
    countEl.textContent = String(len);
    countEl.classList.toggle('limit-exceed', len > COMMENT_LIMIT);
  };
  input.addEventListener('input', updateCounter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      $('#comment-form').requestSubmit();
    }
  });
  updateCounter();

  $('#comment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = input.value.trim();
    if (!content) return;
    if (content.length > COMMENT_LIMIT) return showToast('댓글은 1000자까지 입력 가능합니다', 'error');
    try {
      await postComment('works', id, content);
      showToast('댓글이 등록되었어요', 'success');
      input.value = '';
      await loadAndRender();
    } catch {
      showToast('댓글 등록에 실패했어요', 'error');
    }
  });
});

async function loadAndRender() {
  const comments = await fetchComments('works', id);
  const container = $('#comment-list');
  renderComments(comments, container, currentUserId);

  // 삭제/수정/좋아요/싫어요 이벤트 바인딩은 render-comments.js와 동일 패턴
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.id;
      try { await deleteComment('works', id, cid); await loadAndRender(); showToast('댓글이 삭제되었어요', 'success'); }
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
      const exit = () => {
        const back = document.createElement('p'); back.className='comment-content'; back.textContent = text; textarea.replaceWith(back); saveBtn.remove(); cancelBtn.remove(); btn.style.display=''; };
      cancelBtn.addEventListener('click', (e)=>{e.preventDefault(); exit();});
      textarea.addEventListener('keydown', (e)=>{ if(e.key==='Escape') exit(); });
      saveBtn.addEventListener('click', async ()=>{
        const content = textarea.value.trim();
        if (!content) return showToast('내용을 입력하세요', 'error');
        if (content.length > COMMENT_LIMIT) return showToast('댓글은 1000자까지 입력 가능합니다', 'error');
        try { await editComment('works', id, cid, content); showToast('댓글이 수정되었어요', 'success'); await loadAndRender(); }
        catch { showToast('댓글 수정에 실패했어요', 'error'); }
      });
    });
  });

  document.querySelectorAll('.btn-like').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.id;
      const res = await fetch(`/api/works/${id}/comments/${cid}/like`, { method:'POST', credentials:'include' });
      if (res.ok) { const data = await res.json(); const card = btn.closest('.comment-card'); card.querySelector('.like-count').textContent = data.likes; card.querySelector('.dislike-count').textContent = data.dislikes; btn.classList.add('active'); card.querySelector('.btn-dislike')?.classList.remove('active'); }
    });
  });
  document.querySelectorAll('.btn-dislike').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.id;
      const res = await fetch(`/api/works/${id}/comments/${cid}/dislike`, { method:'POST', credentials:'include' });
      if (res.ok) { const data = await res.json(); const card = btn.closest('.comment-card'); card.querySelector('.like-count').textContent = data.likes; card.querySelector('.dislike-count').textContent = data.dislikes; btn.classList.add('active'); card.querySelector('.btn-like')?.classList.remove('active'); }
    });
  });
}







