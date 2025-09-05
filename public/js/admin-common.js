// Admin 공통 JavaScript
class AdminCommon {
  constructor() {
    this.currentAdmin = null;
    this.init();
  }
  
  // 초기화
  async init() {
    try {
      // 관리자 인증 확인
      await this.checkAuth();
      
      // 이벤트 리스너 등록
      this.bindEvents();
      
      // 현재 페이지 네비게이션 하이라이트
      this.highlightCurrentNav();
      
    } catch (error) {
      console.error('Admin 초기화 오류:', error);
      // 인증 실패 시 로그인 페이지로 리다이렉트
      window.location.href = '/admin';
    }
  }
  
  // 관리자 인증 확인
  async checkAuth() {
    try {
      console.log('인증 확인 시작... 현재 쿠키:', document.cookie);
      const response = await fetch('/api/admin/me', {
        credentials: 'include'
      });
      
      console.log('인증 응답 상태:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('인증 성공:', data);
        this.currentAdmin = data.admin;
        this.updateAdminInfo();
      } else {
        const errorData = await response.json();
        console.error('인증 실패:', errorData);
        throw new Error(`인증 실패: ${errorData.error?.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('인증 확인 오류:', error);
      throw error;
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.handleLogout();
    });
    
    // OTP 모달 관련
    document.getElementById('otpConfirmBtn').addEventListener('click', () => {
      this.confirmOTP();
    });
    
    document.getElementById('otpCancelBtn').addEventListener('click', () => {
      this.closeOTPModal();
    });
    
    document.querySelectorAll('.modal-close').forEach(close => {
      close.addEventListener('click', () => {
        this.closeOTPModal();
      });
    });
  }
  
  // 관리자 정보 업데이트
  updateAdminInfo() {
    if (this.currentAdmin) {
      document.getElementById('adminName').textContent = this.currentAdmin.displayName || this.currentAdmin.username;
    }
  }
  
  // 현재 페이지 네비게이션 하이라이트
  highlightCurrentNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.dashboard-nav .nav-item').forEach(item => {
      item.classList.remove('active');
      const itemPath = item.getAttribute('href');
      if (path === itemPath) {
        item.classList.add('active');
        // 페이지 제목 업데이트
        const pageTitle = item.textContent.trim();
        document.getElementById('pageTitle').textContent = pageTitle;
      }
    });
  }
  
  // 로그아웃 처리
  async handleLogout() {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        window.location.href = '/admin';
      } else {
        alert('로그아웃 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  }
  
  // OTP 확인
  async confirmOTP() {
    const otpToken = document.getElementById('otpInput').value;
    
    if (!otpToken || otpToken.length !== 6) {
      alert('6자리 OTP 코드를 입력하세요.');
      return;
    }
    
    try {
      // OTP 확인 로직 (필요시 구현)
      console.log('OTP 확인:', otpToken);
      this.closeOTPModal();
    } catch (error) {
      console.error('OTP 확인 오류:', error);
      alert('OTP 인증 중 오류가 발생했습니다.');
    }
  }
  
  // OTP 모달 닫기
  closeOTPModal() {
    document.getElementById('otpModal').style.display = 'none';
    document.getElementById('otpInput').value = '';
  }
}

// 전역 인스턴스 생성
window.adminCommon = new AdminCommon();
