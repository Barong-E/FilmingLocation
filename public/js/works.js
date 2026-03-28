import { loadHeader, setupHeaderSearch } from './header-loader.js';

// 기본 포스터 이미지 URL 생성
function getDefaultPosterImage(title) {
  // 제목의 첫 글자를 사용해서 기본 이미지 생성
  const firstChar = title.charAt(0);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const color = colors[title.length % colors.length];
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="120" height="180" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="180" fill="${color}"/>
      <text x="60" y="90" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle">${firstChar}</text>
    </svg>
  `)}`;
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadHeader();
  setupHeaderSearch();

  try {
    const res = await fetch('/api/works');
    const works = await res.json();

    const list = document.getElementById('work-list');
    list.innerHTML = '';
    
    if (!Array.isArray(works) || works.length === 0) {
      list.innerHTML = '<p class="comment-empty">작품이 없습니다.</p>';
      return;
    }

    // 리스트 컨테이너 생성
    const listContainer = document.createElement('div');
    listContainer.className = 'work-list';
    
    works.forEach(work => {
      const item = document.createElement('a');
      item.href = `work?id=${work.id}`;
      item.className = 'work-item';
      
      // 포스터 이미지 URL 처리 (DB의 image 필드 사용)
      const imageUrl = work.image || getDefaultPosterImage(work.title);
      
      item.innerHTML = `
        <div class="work-poster-container">
          <img 
            class="work-poster" 
            src="${imageUrl}" 
            alt="${work.title} 포스터"
            loading="lazy"
            onerror="this.src='${getDefaultPosterImage(work.title)}'"
          />
        </div>
        <div class="work-info">
          <div class="work-title">${work.title}</div>
          <div class="work-details">
            ${(work.type || work.releaseDate) ? `
              <div class="work-meta">
                ${work.type ? `<span class="work-type">${work.type}</span>` : ''}
                ${work.type && work.releaseDate ? `<span class="work-separator">•</span>` : ''}
                ${work.releaseDate ? `<span class="work-release">${work.releaseDate}</span>` : ''}
              </div>
            ` : ''}
            ${work.description ? `<div class="work-description">${work.description}</div>` : ''}
          </div>
        </div>
      `;
      
      listContainer.appendChild(item);
    });
    
    list.appendChild(listContainer);
    
  } catch (error) {
    console.error('작품 목록을 불러오는 중 오류가 발생했습니다:', error);
    const list = document.getElementById('work-list');
    list.innerHTML = '<p class="comment-empty">작품 목록을 불러올 수 없습니다.</p>';
  }
});







