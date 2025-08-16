import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { setupCommentAutoResize, checkAuth } from './utils.js';

const id = new URLSearchParams(window.location.search).get('id');
const $ = s => document.querySelector(s);

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setupHeaderSearch();
  setupCommentAutoResize(); // 댓글 자동 크기 조절 설정

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
  if (placesContainer && w.placeIds && w.placeIds.length > 0) {
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
  
  // 댓글 섹션 로그인 상태 체크
  await checkCommentAuth();
});

// 댓글 섹션 로그인 상태 체크
async function checkCommentAuth() {
  try {
    const user = await checkAuth();
    const commentForm = document.getElementById('comment-form');
    const loginPrompt = document.getElementById('login-prompt');
    
    if (user) {
      // 로그인된 사용자
      if (commentForm) commentForm.style.display = 'block';
      if (loginPrompt) loginPrompt.style.display = 'none';
    } else {
      // 로그인되지 않은 사용자
      if (commentForm) commentForm.style.display = 'none';
      if (loginPrompt) loginPrompt.style.display = 'block';
    }
  } catch (error) {
    console.error('로그인 상태 체크 실패:', error);
    // 에러 발생 시 기본적으로 로그인 안내 표시
    const commentForm = document.getElementById('comment-form');
    const loginPrompt = document.getElementById('login-prompt');
    if (commentForm) commentForm.style.display = 'none';
    if (loginPrompt) loginPrompt.style.display = 'block';
  }
}









