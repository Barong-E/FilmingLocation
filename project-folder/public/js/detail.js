// detail.js

// 1) URL 파라미터에서 ID 추출
const params = new URLSearchParams(location.search);
const placeId = params.get('id');

// 2) JSON 불러오기
Promise.all([
  fetch('data/places.json').then(res => res.json()),
  fetch('data/works.json').then(res => res.json())
])
.then(([places, works]) => {
  const place = places.find(p => p.id === placeId);
  if (!place) throw new Error('해당 장소를 찾을 수 없습니다.');
  const work = works.find(w => w.id === place.workId);

  // 이미지 & alt
  const img = document.getElementById('detail-img');
  img.src = place.image;
  img.alt = place.name;

  // 장소명
  document.getElementById('detail-name').textContent = place.name;

  // 작품명
  document.getElementById('detail-work').textContent = work ? work.title : '알 수 없음';

  // 종류, 공개일, 설명, 등장인물
  if (work) {
    document.getElementById('detail-type').textContent = work.type;
    document.getElementById('detail-release').textContent = work.releaseDate;
    document.getElementById('detail-description').textContent = work.description;
    document.getElementById('detail-characters').textContent = work.characters.join(', ');
  }

  // 주소 링크
  const addr = document.getElementById('detail-address');
  addr.textContent = place.address;
  addr.href = place.mapUrl || '#'; // 필요시 JSON에 mapUrl 추가
})
.catch(err => {
  console.error(err);
  document.getElementById('detail').innerHTML = '<p>정보를 불러오는 데 실패했습니다.</p>';
});