// public/js/detail.js

import { formatPlaceName, setupCommentAutoResize, checkAuth } from './utils.js';
import { loadHeader, setupHeaderSearch } from './header-loader.js';

// placeId를 스크립트 스코프에서 한 번만 파싱
const params = new URLSearchParams(window.location.search);
const placeId = params.get('id'); // 이제 이 id는 MongoDB의 _id

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadHeader();
    setupHeaderSearch();
    renderDetailPage(); // 페이지 렌더링 함수 호출
    setupCommentAutoResize(); // 댓글 자동 크기 조절 설정
  } catch (error) {
    console.error('헤더 로드 실패:', error);
  }
});

async function renderDetailPage() {
  if (!placeId) {
    document.getElementById('detail').innerHTML = '<p>장소 ID가 없습니다.</p>';
    return;
  }
  
  try {
    const res = await fetch(`/api/places/${placeId}`);
    if (!res.ok) throw new Error('장소 정보를 불러오는 데 실패했습니다.');
    
    const place = await res.json();
    const work = place.work;

    // 표시할 이름 결정 (실제 이름 / 설정된 가명)
    const displayName = formatPlaceName(place.real_name, place.fictional_name);

    // 문서 제목 동적 변경
    if (work && displayName) {
      document.title = `${work.title}_${displayName}`;
    }

    // 이미지 설정
    const imgEl = document.getElementById('detail-img');
    imgEl.src = place.image;
    imgEl.alt = displayName;

    // 장소명, 작품명 표시
    document.getElementById('detail-name').textContent = displayName;
    document.getElementById('detail-work').textContent = work ? work.title : '알 수 없음';

    // 작품 상세 정보 표시
    if (work) {
      document.getElementById('detail-type').textContent = work.type || '';
      document.getElementById('detail-release').textContent = work.releaseDate || '';
      document.getElementById('detail-description').textContent = work.description || '';
      // document.getElementById('detail-characters').textContent = work.characters.join(', ');

      // 등장인물 정보를 링크로 생성
      const charsContainer = document.getElementById('detail-characters');
      charsContainer.innerHTML = ''; // 초기화

      // work.characters (모든 등장인물) 기준으로 목록 생성
      if (work.characters && work.characters.length > 0) {
        work.characters.forEach((characterName, index) => {
          // "박서준(박새로이)" -> "박서준" 추출
          const realName = characterName.split('(')[0].trim();
          
          // characterIds 배열에서 현재 배우 정보 찾기
          const characterInfo = (work.characterIds || []).find(c => c.name === realName);

          if (characterInfo) {
            // DB에 등록된 인물이면 링크 생성
            const roleName = characterName.match(/\(([^)]+)\)/); // (배역) 부분 추출
            
            const link = document.createElement('a');
            link.href = `character.html?id=${characterInfo.id}`; // character.id 사용
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
          if (index < work.characters.length - 1) {
            charsContainer.append(', ');
          }
        });
      }
    }

    // 주소 링크 설정
    const addrEl = document.getElementById('detail-address');
    addrEl.textContent = place.address;
    addrEl.href = place.mapUrl || '#';
  } catch (err) {
    console.error(err);
    document.getElementById('detail').innerHTML = `<p>${err.message}</p>`;
  }
  
  // 댓글 섹션 로그인 상태 체크
  await checkCommentAuth();
}



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


