import { formatPlaceName } from './utils.js';

const params = new URLSearchParams(window.location.search);
const placeId = params.get('id');

Promise.all([
  fetch('data/places.json').then(r => r.json()),
  fetch('data/works.json').then(r => r.json())
])
.then(([places, works]) => {
  const place = places.find(p => p.id === placeId);
  if (!place) throw new Error('해당 장소를 찾을 수 없습니다.');
  const work = works.find(w => w.id === place.workId);

  const displayName = formatPlaceName(place.real_name, place.fictional_name);

  if (work && displayName) {
    document.title = `${work.title}_${displayName}`;
  }

  const imgEl = document.getElementById('detail-img');
  imgEl.src = place.image;
  imgEl.alt = displayName;

  document.getElementById('detail-name').textContent = displayName;
  document.getElementById('detail-work').textContent = work ? work.title : '알 수 없음';

  if (work) {
    document.getElementById('detail-type').textContent = work.type;
    document.getElementById('detail-release').textContent = work.releaseDate;
    document.getElementById('detail-description').textContent = work.description;
    document.getElementById('detail-characters').textContent = work.characters.join(', ');
  }

  const addrEl = document.getElementById('detail-address');
  addrEl.textContent = place.address;
  addrEl.href = place.mapUrl || '#';
})
.catch(err => {
  console.error(err);
  document.getElementById('detail').innerHTML = '<p>정보를 불러오는 데 실패했습니다.</p>';
});
