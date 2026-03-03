// 로그 관리 페이지 스텁 스크립트
document.addEventListener('DOMContentLoaded', () => {
  const initPage = () => {
    const exportBtn = document.getElementById('logsExportBtn');
    if (exportBtn && !exportBtn._bound) {
      exportBtn._bound = true;
      exportBtn.addEventListener('click', () => {
        window.adminCommon?.showToast('로그 CSV 내보내기 준비 중...', 'info');
      });
    }
  };

  setTimeout(initPage, 0);
});






