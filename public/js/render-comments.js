import { fetchPlaceComments, fetchComments, postComment, deleteComment, editComment, renderComments } from './render-comments-utils.js';
import { checkAuth }                          from './render-places.js';
import { showToast }                          from './utils.js';

const placeId       = new URLSearchParams(window.location.search).get('id');
const commentForm   = document.getElementById('comment-form');
const commentInput  = document.getElementById('comment-input');
const commentListEl = document.getElementById('comment-list');
const countEl       = document.getElementById('comment-count');
const limitEl       = document.getElementById('comment-limit');
const COMMENT_LIMIT = 1000;

let currentUserId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1) 로그인 확인
  const user = await checkAuth();
  if (user) {
    currentUserId       = user.id;
    commentForm.style.display = 'block';
  }

  // 2) 댓글 불러와 렌더링
  await loadAndRender();

  // 3) 댓글 작성 폼 제출
  commentForm.addEventListener('submit', async e => {
    e.preventDefault();
    const content = commentInput.value.trim();
    if (!content) return;
    if (content.length > COMMENT_LIMIT) {
      return showToast('댓글은 1000자까지 입력 가능합니다', 'error');
    }

    // 낙관적 UI 업데이트: 먼저 화면에 추가 후 서버에 저장
    try {
      const optimistic = {
        _id: 'temp-' + Date.now(),
        userId: { _id: currentUserId, nickname: user?.nickname, displayName: user?.displayName },
        content,
        createdAt: new Date().toISOString()
      };
      const current = await fetchPlaceComments(placeId);
      renderComments([optimistic, ...current], commentListEl, currentUserId);

      await postComment('places', placeId, content);
      showToast('댓글이 등록되었어요', 'success');
      commentInput.value = '';
      await loadAndRender();
    } catch (e) {
      showToast('댓글 등록에 실패했어요', 'error');
    }
  });

  // 글자수 카운터 갱신
  limitEl.textContent = String(COMMENT_LIMIT);
  const updateCounter = () => {
    const len = commentInput.value.length;
    countEl.textContent = String(len);
    if (len > COMMENT_LIMIT) {
      countEl.classList.add('limit-exceed');
    } else {
      countEl.classList.remove('limit-exceed');
    }
  };
  commentInput.addEventListener('input', updateCounter);
  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commentForm.requestSubmit();
    }
  });
  updateCounter();
});

async function loadAndRender() {
  try {
    // 댓글 가져오기
    const comments = await fetchPlaceComments(placeId);
    // 화면에 렌더링 (닉네임 우선 노출)
    renderComments(comments, commentListEl, currentUserId);

    // 삭제 버튼 이벤트 바인딩
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cid = btn.dataset.id;
        try {
          await deleteComment('places', placeId, cid);
          showToast('댓글이 삭제되었어요', 'success');
          await loadAndRender();
        } catch (e) {
          showToast('댓글 삭제에 실패했어요', 'error');
        }
      });
    });

      // 수정 버튼 이벤트 바인딩 (취소/ESC/길이 제한 포함)
      document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cid = btn.dataset.id;
          const card = btn.closest('.comment-card');
          const p = card.querySelector('.comment-content');
          const old = p.textContent;
          const textarea = document.createElement('textarea');
          // '(수정됨)' 표기는 편집 텍스트에 포함되지 않도록 제거
          const sanitized = old.replace(/\(수정됨\)\s*$/, '').trimEnd();
          textarea.value = sanitized;
          textarea.style.width = '100%';
          textarea.style.minHeight = '80px';
          textarea.style.boxSizing = 'border-box';
          textarea.style.padding = '10px 12px';
          textarea.style.border = '1px solid #ddd';
          textarea.style.borderRadius = '8px';
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

          const exitEdit = () => {
            const pNew = document.createElement('p');
            pNew.className = 'comment-content';
            pNew.textContent = old;
            textarea.replaceWith(pNew);
            saveBtn.remove();
            cancelBtn.remove();
            btn.style.display = '';
          };

          cancelBtn.addEventListener('click', (e) => { e.preventDefault(); exitEdit(); });
          textarea.addEventListener('keydown', (e) => { if (e.key === 'Escape') exitEdit(); });

          saveBtn.addEventListener('click', async () => {
            const content = textarea.value.trim();
            if (!content) return showToast('내용을 입력하세요', 'error');
            if (content.length > COMMENT_LIMIT) return showToast('댓글은 1000자까지 입력 가능합니다', 'error');
            try {
              await editComment('places', placeId, cid, content);
              showToast('댓글이 수정되었어요', 'success');
              await loadAndRender();
            } catch (e) {
              showToast('댓글 수정에 실패했어요', 'error');
            }
          });
        });
      });

      // 좋아요/싫어요 이벤트 바인딩
      document.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cid = btn.dataset.id;
          try {
            const res = await fetch(`/api/places/${placeId}/comments/${cid}/like`, { method:'POST', credentials:'include' });
            if (res.ok) {
              const data = await res.json();
              const card = btn.closest('.comment-card');
              card.querySelector('.like-count').textContent = data.likes;
              card.querySelector('.dislike-count').textContent = data.dislikes;
              // 활성 표시 토글(대략적인 처리: 좋아요 누르면 like 활성, 싫어요 비활성)
              btn.classList.add('active');
              const other = card.querySelector('.btn-dislike');
              other?.classList.remove('active');
            } else {
              showToast('로그인이 필요합니다', 'error');
            }
          } catch (_) {
            showToast('처리 중 오류가 발생했어요', 'error');
          }
        });
      });

      document.querySelectorAll('.btn-dislike').forEach(btn => {
        btn.addEventListener('click', async () => {
          const cid = btn.dataset.id;
          try {
            const res = await fetch(`/api/places/${placeId}/comments/${cid}/dislike`, { method:'POST', credentials:'include' });
            if (res.ok) {
              const data = await res.json();
              const card = btn.closest('.comment-card');
              card.querySelector('.like-count').textContent = data.likes;
              card.querySelector('.dislike-count').textContent = data.dislikes;
              btn.classList.add('active');
              const other = card.querySelector('.btn-like');
              other?.classList.remove('active');
            } else {
              showToast('로그인이 필요합니다', 'error');
            }
          } catch (_) {
            showToast('처리 중 오류가 발생했어요', 'error');
          }
        });
      });
  } catch (err) {
    console.error(err);
  }
}
