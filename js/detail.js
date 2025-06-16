// public/js/detail.js

// 1) URL 파라미터에서 ID 추출
const params = new URLSearchParams(window.location.search);
const placeId = params.get('id');

// 2) JSON 불러오기
Promise.all([
  fetch('data/places.json').then(r => r.json()),
  fetch('data/works.json').then(r => r.json())
])
.then(([places, works]) => {
  const place = places.find(p => p.id === placeId);
  if (!place) throw new Error('해당 장소를 찾을 수 없습니다.');
  const work = works.find(w => w.id === place.workId);

  // 문서 제목을 동적으로 변경
  if (work && place.name) {
    document.title = `${work.title}_${place.name}`;
  }

  // 이미지 & alt 설정
  const imgEl = document.getElementById('detail-img');
  imgEl.src = place.image;
  imgEl.alt = place.name;

  // 장소명, 작품명 반영
  document.getElementById('detail-name').textContent = place.name;
  document.getElementById('detail-work').textContent = work ? work.title : '알 수 없음';

  // 상세 정보 채우기
  if (work) {
    document.getElementById('detail-type').textContent = work.type;
    document.getElementById('detail-release').textContent = work.releaseDate;
    document.getElementById('detail-description').textContent = work.description;
    document.getElementById('detail-characters').textContent = work.characters.join(', ');
  }

  // 주소 링크 설정
  const addrEl = document.getElementById('detail-address');
  addrEl.textContent = place.address;
  addrEl.href = place.mapUrl || '#';
})
.catch(err => {
  console.error(err);
  document.getElementById('detail').innerHTML = '<p>정보를 불러오는 데 실패했습니다.</p>';
});
