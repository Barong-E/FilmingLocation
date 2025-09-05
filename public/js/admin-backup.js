// 백업 관리 페이지 JavaScript
class AdminBackup {
  constructor() {
    this.init();
  }
  
  // 초기화
  async init() {
    try {
      // 이벤트 리스너 등록
      this.bindEvents();
      
    } catch (error) {
      console.error('백업 관리 초기화 오류:', error);
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 백업 버튼
    document.getElementById('backupBtn').addEventListener('click', () => {
      this.handleBackup();
    });
  }
  
  // 백업 처리
  async handleBackup() {
    try {
      // OTP 모달 표시
      document.getElementById('otpModal').style.display = 'flex';
      document.getElementById('otpInput').focus();
      
    } catch (error) {
      console.error('백업 처리 오류:', error);
      alert('백업 처리 중 오류가 발생했습니다.');
    }
  }
  
  // OTP 확인 후 백업 실행
  async confirmBackup(otpToken) {
    try {
      const response = await fetch('/api/admin/backup', {
        method: 'GET',
        headers: {
          'X-OTP-Token': otpToken
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        // 백업 파일 다운로드
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filo-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        alert('백업이 성공적으로 완료되었습니다.');
        document.getElementById('otpModal').style.display = 'none';
        document.getElementById('otpInput').value = '';
        
      } else {
        const error = await response.json();
        alert(error.error?.message || '백업에 실패했습니다.');
      }
    } catch (error) {
      console.error('백업 실행 오류:', error);
      alert('백업 실행 중 오류가 발생했습니다.');
    }
  }
}

// 전역 인스턴스 생성
window.adminBackup = new AdminBackup();

