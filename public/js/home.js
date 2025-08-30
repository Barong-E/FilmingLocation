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
    
    console.log('🏠 홈페이지 초기화 완료');
  } catch (error) {
    console.error('❌ 홈페이지 초기화 실패:', error);
  }
});
