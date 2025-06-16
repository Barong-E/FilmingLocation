// public/js/render-places.js

// 1) JSON 불러오기
fetch('data/places.json')
  .then(res => res.json())
  .then(places => {
    const container = document.getElementById('place-list');

    places.forEach(place => {
      // a.place-card 요소 생성
      const card = document.createElement('a');
      card.href = `place.html?id=${place.id}`;
      card.className = 'place-card';

      // 내부 HTML 채우기
      card.innerHTML = `
        <img src="${place.image}" 
             alt="${place.name}" 
             class="place-img" />
        <div class="place-info">
          <div class="place-name">${place.name}</div>
          <div class="work-name">${getWorkTitle(place.workId)}</div>
          <div class="place-address">${place.address}</div>
        </div>
      `;

      container.appendChild(card);
    });
  })
  .catch(err => console.error('places.json 불러오기 실패', err));

// 작품명 매핑 함수 (나중에 works.json 연동으로 교체 예정)
function getWorkTitle(workId) {
  const titles = {
    'itaewon-class': '이태원 클라쓰',
    'crash-landing-on-you': '사랑의 불시착'
  };
  return titles[workId] || '알 수 없음';
}
