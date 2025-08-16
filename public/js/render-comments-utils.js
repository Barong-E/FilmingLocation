// 댓글 API 호출 및 렌더링 함수만 모아둔 유틸
// 공통 댓글 API 유틸: places | works | characters
export async function fetchComments(target, entityId) {
  console.log(`[DEBUG] fetchComments 호출: target=${target}, entityId=${entityId}`);
  try {
    // 백엔드 라우트와 일치하도록 경로 수정
    const res = await fetch(`/api/${target}/${entityId}/comments`, { credentials: 'include' });
    console.log(`[DEBUG] fetchComments 응답: ${res.status} ${res.statusText}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    console.log(`[DEBUG] fetchComments 데이터:`, data);
    return data;
  } catch (error) {
    console.error(`[ERROR] fetchComments 실패:`, error);
    throw error;
  }
}

export async function postComment(target, entityId, content) {
  console.log(`[DEBUG] postComment 호출: target=${target}, entityId=${entityId}, content=${content}`);
  try {
    const res = await fetch(`/api/${target}/${entityId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content })
    });
    console.log(`[DEBUG] postComment 응답: ${res.status} ${res.statusText}`);
    if (!res.ok) throw new Error('댓글 등록 중 오류 발생');
    return res.json();
  } catch (error) {
    console.error(`[ERROR] postComment 실패:`, error);
    throw error;
  }
}

export async function deleteComment(target, entityId, commentId) {
  console.log(`[DEBUG] deleteComment 호출: target=${target}, entityId=${entityId}, commentId=${commentId}`);
  try {
    const res = await fetch(`/api/${target}/${entityId}/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    console.log(`[DEBUG] deleteComment 응답: ${res.status} ${res.statusText}`);
    if (!res.ok) throw new Error('댓글 삭제 중 오류 발생');
    return res.json();
  } catch (error) {
    console.error(`[ERROR] deleteComment 실패:`, error);
    throw error;
  }
}

export async function editComment(target, entityId, commentId, content) {
  console.log(`[DEBUG] editComment 호출: target=${target}, entityId=${entityId}, commentId=${commentId}, content=${content}`);
  try {
    const res = await fetch(`/api/${target}/${entityId}/comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content })
    });
    console.log(`[DEBUG] editComment 응답: ${res.status} ${res.statusText}`);
    if (!res.ok) throw new Error('댓글 수정 중 오류 발생');
    return res.json();
  } catch (error) {
    console.error(`[ERROR] editComment 실패:`, error);
    throw error;
  }
}

// 하위 호환: 장소 전용 함수 유지
export async function fetchPlaceComments(placeId) {
  return fetchComments('places', placeId);
}

import { formatRelativeTime } from './utils.js';

export function renderComments(comments, container, currentUserId) {
  container.innerHTML = '';
  if (!comments || comments.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'comment-empty';
    empty.textContent = '아직 댓글이 없어요. 첫 댓글을 남겨보세요!';
    container.appendChild(empty);
    return;
  }

  comments.forEach(c => {
    const author = c.userId?.nickname || c.userId?.displayName || '익명';
    const avatar = c.userId?.profileImage ? `${c.userId.profileImage}?v=${Date.now()}` : null;
    const likes = Array.isArray(c.likes) ? c.likes.length : (c.likes || 0);
    const dislikes = Array.isArray(c.dislikes) ? c.dislikes.length : (c.dislikes || 0);

    const div = document.createElement('div');
    div.className = 'comment-card';
    div.innerHTML = `
      <div class="comment-meta">
        <div class="left">
          ${avatar ? `<img src="${avatar}" alt="avatar" style="width:28px;height:28px;border-radius:50%;object-fit:cover;">`
                   : `<div style="width:28px;height:28px;border-radius:50%;background:#e9ecef;display:flex;align-items:center;justify-content:center;font-size:14px;color:#888;">${author[0] || '?'}</div>`}
          <span class="author-name">${author}</span>
        </div>
        <div class="right">
          <span class="comment-date">${formatRelativeTime(c.createdAt)}</span>
          <button class="thumb-btn thumb-like btn-like" data-id="${c._id}" title="좋아요">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-6 0v4H5a2 2 0 0 0-2 2l1 8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-7a2 2 0 0 0-2-2h-1z"/></svg>
            <span class="like-count thumb-count">${likes}</span>
          </button>
          <button class="thumb-btn thumb-dislike btn-dislike" data-id="${c._id}" title="싫어요">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 6 0v-4h3a2 2 0 0 0 2-2l-1-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2l-1 7a2 2 0 0 0 2 2h1z"/></svg>
            <span class="dislike-count thumb-count">${dislikes}</span>
          </button>
        </div>
      </div>
      <p class="comment-content">${c.content}${c.updatedAt ? ' <span style="color:#aaa;font-size:12px;">(수정됨)</span>' : ''}</p>
      ${c.userId._id === currentUserId 
        ? `<div class="comment-foot">
             <button class="btn-edit" data-id="${c._id}">수정</button>
             <button class="btn-delete" data-id="${c._id}">삭제</button>
           </div>`
        : ''}
    `;
    container.appendChild(div);
  });
}
