let cropper = null; // cropperjs 인스턴스

// 내 정보 불러오기
async function fetchMyProfile() {
  const res = await fetch('/api/user/me', { credentials: 'include' });
  if (!res.ok) {
    // 비로그인: 강제 리다이렉트 대신 null 반환하여 페이지 내에서 처리
    return null;
  }
  return res.json();
}

// 페이지 로딩 시 데이터 바인딩
document.addEventListener('DOMContentLoaded', async () => {
  const user = await fetchMyProfile();
  if (!user) {
    // 비로그인 상태 UI 표시 (현재 페이지 유지)
    const container = document.querySelector('.mypage-container');
    if (container) {
      const redirectUrl = window.location.pathname + window.location.search;
      container.innerHTML = `
        <h2 style="margin-top:24px;">마이페이지</h2>
        <p style="margin:12px 0 20px;">로그인이 필요합니다.</p>
        <a class="btn btn-main" href="/login.html?redirect_uri=${encodeURIComponent(redirectUrl)}">로그인하기</a>
      `;
    }
    return;
  }

  // 프로필 사진 (처음 진입 시에도 캐시 무시)
  const avatarDiv = document.getElementById('profile-avatar');
  if (user.profileImageUrl) {
    const ts = Date.now();
    avatarDiv.style.backgroundImage = `url('${user.profileImageUrl}?v=${ts}')`;
    avatarDiv.innerHTML = '';
  } else {
    // 닉네임 첫글자와 컬러로 더미 아이콘
    avatarDiv.innerHTML = `<span class="avatar-text">${user.nickname?.[0] || '?'}</span>`;
    avatarDiv.style.background = '#00c896';
    avatarDiv.style.color = '#fff';
  }
  // 닉네임
  document.getElementById('user-nickname').textContent = user.nickname || '';
  document.getElementById('input-nickname').value = user.nickname || '';
  // 이메일
  document.getElementById('user-email').textContent = user.email || '';
});

// 닉네임 인라인 수정
document.getElementById('btn-edit-nickname').addEventListener('click', () => {
  document.getElementById('user-nickname').style.display = 'none';
  document.getElementById('btn-edit-nickname').style.display = 'none';
  document.getElementById('input-nickname').style.display = 'inline-block';
  document.getElementById('btn-save-nickname').style.display = 'inline-block';
  document.getElementById('input-nickname').focus();
});

document.getElementById('btn-save-nickname').addEventListener('click', async () => {
  const newNickname = document.getElementById('input-nickname').value.trim();
  if (!newNickname) return alert('닉네임을 입력하세요!');
  const res = await fetch('/api/user/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ nickname: newNickname })
  });
  if (res.ok) {
    document.getElementById('user-nickname').textContent = newNickname;
    document.getElementById('user-nickname').style.display = '';
    document.getElementById('btn-edit-nickname').style.display = '';
    document.getElementById('input-nickname').style.display = 'none';
    document.getElementById('btn-save-nickname').style.display = 'none';
    alert('닉네임이 수정되었습니다!');
  } else {
    alert('닉네임 수정 실패');
  }
});

// 닉네임 인라인 수정 취소 (ESC)
document.getElementById('input-nickname').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('user-nickname').style.display = '';
    document.getElementById('btn-edit-nickname').style.display = '';
    document.getElementById('input-nickname').style.display = 'none';
    document.getElementById('btn-save-nickname').style.display = 'none';
  }
});

// 프로필 사진 클릭 → 파일 선택 열기
document.getElementById('profile-avatar').addEventListener('click', () => {
  document.getElementById('avatar-input').click();
});

// 프로필 사진 파일 선택 → 크롭 모달 띄우기 & cropperjs 적용
document.getElementById('avatar-input').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  // 파일을 읽어서 미리보기 이미지로 보여줌
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = document.getElementById('cropper-image');
    img.src = event.target.result;
    document.getElementById('cropper-modal').style.display = 'flex';

    if (cropper) cropper.destroy();
    cropper = new Cropper(img, {
      aspectRatio: 1, // 정사각형
      viewMode: 1,
      autoCropArea: 1,
      minContainerWidth: 200,
      minContainerHeight: 200,
    });
  };
  reader.readAsDataURL(file);
});

// "이렇게 자르기" 버튼 → 크롭 결과를 서버로 업로드
document.getElementById('btn-crop-ok').addEventListener('click', async () => {
  if (!cropper) return;
  cropper.getCroppedCanvas({ width: 200, height: 200 }).toBlob(async function(blob) {
    const formData = new FormData();
    formData.append('profileImage', blob, 'profile.jpg');
    const res = await fetch('/api/user/me/profile-image', {
      method: 'PATCH',
      credentials: 'include',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      const ts = Date.now(); // 새로고침 없이 항상 새 이미지
      document.getElementById('profile-avatar').style.backgroundImage =
        `url('${data.profileImageUrl}?v=${ts}')`;
      document.getElementById('profile-avatar').innerHTML = '';
      document.getElementById('cropper-modal').style.display = 'none';
      cropper.destroy(); cropper = null;
      alert('프로필 사진이 변경되었습니다!');
    } else {
      alert('프로필 사진 변경 실패');
    }
  }, 'image/jpeg', 0.9);
});

// "취소" 버튼 → 크롭 모달 닫기
document.getElementById('btn-crop-cancel').addEventListener('click', () => {
  document.getElementById('cropper-modal').style.display = 'none';
  if (cropper) {
    cropper.destroy();
    cropper = null;
  }
});

// 로그아웃
document.getElementById('btn-logout').addEventListener('click', () => {
  const origin = window.location.origin;

  // 1) 헤더에서 마이페이지 들어오기 직전에 저장한 값 우선
  let redirectPath = null;
  try {
    redirectPath = sessionStorage.getItem('prev_url_before_mypage');
    sessionStorage.removeItem('prev_url_before_mypage');
  } catch (e) { /* storage 접근 실패는 무시 */ }

  // 2) 저장값이 없으면 내부 referrer 사용
  if (!redirectPath) {
    const ref = document.referrer;
    if (ref && ref.startsWith(origin)) {
      const u = new URL(ref);
      redirectPath = u.pathname + u.search;
    }
  }

  // 3) 그래도 없으면 홈
  if (!redirectPath) redirectPath = '/places.html';

  window.location.href = `/auth/logout?redirect_uri=${encodeURIComponent(redirectPath)}`;
});
