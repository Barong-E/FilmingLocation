// public/js/works-renderer.js
import { highlightText, smartTruncate } from './highlight-utils.js';

// 기본 포스터 이미지 URL 생성 (works.js와 동일 로직)
function getDefaultPosterImage(title) {
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

export function renderWorks(works, root, searchQuery = '') {
  const list = typeof root === 'string' ? document.getElementById(root) : (root || document.getElementById('work-list'));
  if (!list) return;
  
  // 🚨 안전성 검사 추가: works가 배열인지 확인
  if (!Array.isArray(works)) {
    console.warn('⚠️ renderWorks: works가 배열이 아닙니다:', works);
    works = []; // 빈 배열로 초기화
  }
  
  list.innerHTML = '';
  // 검색 결과 페이지에서는 work-list 클래스를 추가하지 않음 (패딩 충돌 방지)

  works.forEach(work => {
    const item = document.createElement('a');
    const wid = work.id || work._id;
    item.href = `/work?id=${wid}`;
    item.className = 'work-item';

    const imageUrl = work.image || getDefaultPosterImage(work.title);

    // 🎨 검색어 하이라이팅 적용
    const highlightedTitle = searchQuery ? highlightText(work.title, searchQuery) : work.title;
    const highlightedType = searchQuery ? highlightText(work.type || '', searchQuery) : (work.type || '');
    const highlightedDescription = searchQuery ? 
      smartTruncate(work.description || '', searchQuery, 100) : (work.description || '');
    const finalDescription = searchQuery && highlightedDescription ? 
      highlightText(highlightedDescription, searchQuery) : highlightedDescription;

    item.innerHTML = `
      <div class="work-poster-container">
        <img class="work-poster" src="${imageUrl}" alt="${work.title} 포스터" loading="lazy" onerror="this.src='${getDefaultPosterImage(work.title)}'"/>
      </div>
      <div class="work-info">
        <div class="work-title">${highlightedTitle}</div>
        <div class="work-details">
          ${(work.type || work.releaseDate) ? `
            <div class="work-meta">
              ${work.type ? `<span class="work-type">${highlightedType}</span>` : ''}
              ${work.type && work.releaseDate ? `<span class="work-separator">•</span>` : ''}
              ${work.releaseDate ? `<span class="work-release">${work.releaseDate}</span>` : ''}
            </div>
          ` : ''}
          ${finalDescription ? `<div class="work-description">${finalDescription}</div>` : ''}
        </div>
      </div>
    `;

    list.appendChild(item);
  });
}
