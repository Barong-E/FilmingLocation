// 홈페이지 전용 스크립트
import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { loadGNB } from './gnb-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 헤더와 GNB 로드
    await loadHeader();
    loadGNB();
    
    // 헤더 검색 기능 초기화 (중요!)
    setupHeaderSearch();

    // 홈 검색 폼: 클릭 시 헤더 검색창 열기
    const searchTrigger = document.getElementById('home-search-trigger');
    if (searchTrigger) {
      searchTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        
        // 헤더의 돋보기 아이콘을 찾아 클릭 이벤트를 발생시킴
        const headerSearchIcon = document.getElementById('search-icon');
        if (headerSearchIcon) {
          // 스크롤을 맨 위로 올려서 헤더가 잘 보이게 함
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          // 약간의 지연 후 클릭 이벤트 발생 (스크롤 완료 후 실행되도록)
          setTimeout(() => {
            headerSearchIcon.click();
          }, 100);
        }
      });
    }

    // 추천 키워드 칩 클릭 시 검색
    document.querySelectorAll('.keyword-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = btn.getAttribute('data-keyword') || '';
        if (!q) return;
        window.location.href = `/search?q=${encodeURIComponent(q)}`;
      });
    });
    
    console.log('🏠 홈페이지 초기화 완료');
  } catch (error) {
    console.error('❌ 홈페이지 초기화 실패:', error);
  }
});
