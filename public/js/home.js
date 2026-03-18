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

    // 홈 검색 폼: 입력 후 /search?q=... 로 이동
    const form = document.getElementById('home-search-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('home-search-input');
        const q = input?.value?.trim() || '';
        if (!q) return;
        window.location.href = `/search?q=${encodeURIComponent(q)}`;
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
