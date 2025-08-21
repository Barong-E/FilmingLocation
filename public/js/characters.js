import { loadHeader, setupHeaderSearch } from './header-loader.js';

// 나이 계산 함수
function calculateAge(birthDate) {
  if (!birthDate) return null;
  
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

// 날짜 포맷팅 함수
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}.${month}.${day}`;
}

// 기본 프로필 이미지 URL 생성
function getDefaultProfileImage(name) {
  // 이름의 첫 글자를 사용해서 기본 이미지 생성
  const firstChar = name.charAt(0);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const color = colors[name.length % colors.length];
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" fill="${color}"/>
      <text x="100" y="120" font-family="Arial, sans-serif" font-size="80" fill="white" text-anchor="middle">${firstChar}</text>
    </svg>
  `)}`;
}

// 국적과 직업 정보를 조합하는 함수 (국적 제거)
function formatJob(job) {
  return job || '';
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setupHeaderSearch();

  try {
    const res = await fetch('/api/characters');
    const list = await res.json();

    // 디버깅: API 응답 데이터 확인
    console.log('🔍 API 응답 데이터:', list);
    if (list.length > 0) {
      console.log('🔍 첫 번째 인물 데이터:', list[0]);
      console.log('🔍 사용 가능한 필드들:', Object.keys(list[0]));
    }

    const el = document.getElementById('character-list');
    el.innerHTML = '';
    
    if (!Array.isArray(list) || list.length === 0) {
      el.innerHTML = '<p class="comment-empty">등장인물이 없습니다.</p>';
      return;
    }

    // 그리드 컨테이너 생성
    const gridContainer = document.createElement('div');
    gridContainer.className = 'character-grid';
    
    list.forEach((character, index) => {
      const age = calculateAge(character.birthDate);
      const formattedBirth = formatDate(character.birthDate);
      const nationalityAndJob = formatJob(character.job);
      
      // 디버깅: 각 인물의 이미지 관련 데이터 확인
      console.log(`🔍 인물 ${index + 1} (${character.name}):`, {
        image: character.image,
        profileImage: character.profileImage,
        photo: character.photo,
        avatar: character.avatar,
        picture: character.picture
      });
      
      const card = document.createElement('a');
      card.href = `character?id=${character.id}`;
      card.className = 'character-card';
      
      // 이미지 URL 처리 - DB 스키마에 맞게 image 필드 사용
      let imageUrl = character.image || getDefaultProfileImage(character.name);
      
      // 이미지가 기본 이미지가 아닌 경우 경로 확인
      if (imageUrl && !imageUrl.startsWith('data:')) {
        console.log(`🔍 이미지 URL: ${imageUrl}`);
      }
      
      card.innerHTML = `
        <div class="character-image-container">
          <img 
            class="character-image" 
            src="${imageUrl}" 
            alt="${character.name} 프로필 이미지"
            loading="lazy"
            onerror="this.src='${getDefaultProfileImage(character.name)}'"
            onload="console.log('✅ 이미지 로드 성공:', this.src)"
          />
        </div>
        <div class="character-info">
          <div class="character-name-row">
            <span class="character-name">${character.name}</span>
            ${nationalityAndJob ? `<span class="character-subtitle">${nationalityAndJob}</span>` : ''}
          </div>
          ${formattedBirth ? `
            <div class="character-birth-row">
              <span class="character-birth">${formattedBirth}</span>
              ${age !== null ? `<span class="character-age">(${age}세)</span>` : ''}
            </div>
          ` : ''}
        </div>
      `;
      
      gridContainer.appendChild(card);
    });
    
    el.appendChild(gridContainer);
    
  } catch (error) {
    console.error('인물 목록을 불러오는 중 오류가 발생했습니다:', error);
    const el = document.getElementById('character-list');
    el.innerHTML = '<p class="comment-empty">인물 목록을 불러올 수 없습니다.</p>';
  }
});


