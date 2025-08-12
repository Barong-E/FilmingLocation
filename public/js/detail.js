// public/js/detail.js

import { formatPlaceName } from './utils.js';
import { loadHeader, setupHeaderSearch } from './header-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadHeader();
    setupHeaderSearch();
  } catch (error) {
    console.error('헤더 로드 실패:', error);
  }
});

const params = new URLSearchParams(window.location.search);
const placeId = params.get('id');

Promise.all([
  fetch(`http://localhost:5000/api/places/${placeId}`)
    .then(res => res.json()),
  fetch('http://localhost:5000/api/works')
    .then(res => res.json())
])
.then(([place, works]) => {
  if (!place) throw new Error('해당 장소를 찾을 수 없습니다.');

  // 연관된 작품 찾기
  const work = works.find(w => w.id === place.workId);

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
