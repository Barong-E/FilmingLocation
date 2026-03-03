// 백업 관리 페이지 스텁 스크립트
document.addEventListener('DOMContentLoaded', () => {
  const initPage = () => {
    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn && !backupBtn._bound) {
      backupBtn._bound = true;
      backupBtn.addEventListener('click', () => {
        window.adminCommon?.showToast('백업 작업을 준비 중입니다...', 'info');
      });
    }
  };

  setTimeout(initPage, 0);
});






