// public/js/works-renderer.js

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

export function renderWorks(works, root) {
  const list = typeof root === 'string' ? document.getElementById(root) : (root || document.getElementById('work-list'));
  if (!list) return;
  list.innerHTML = '';
  list.className = 'work-list';

  works.forEach(work => {
    const item = document.createElement('a');
    item.href = `work?id=${work.id}`;
    item.className = 'work-item';

    const imageUrl = work.image || getDefaultPosterImage(work.title);

    item.innerHTML = `
      <div class="work-poster-container">
        <img class="work-poster" src="${imageUrl}" alt="${work.title} 포스터" loading="lazy" onerror="this.src='${getDefaultPosterImage(work.title)}'"/>
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

    list.appendChild(item);
  });
}
