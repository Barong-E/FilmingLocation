// FiLo 관리자 공통 JavaScript 유틸리티
class AdminCommon {
  constructor() {
    this.currentAdmin = null;
    this.cropper = null;
    this.init();
  }

  // 초기화
  async init() {
    try {
      await this.checkAuth();
      this.bindCommonEvents();
      this.updateActiveNav();
    } catch (error) {
      console.error('관리자 공통 초기화 오류:', error);
      window.location.href = '/admin-login.html';
    }
  }

  // 관리자 인증 확인
  async checkAuth() {
    try {
      const response = await fetch('/api/admin/me', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.currentAdmin = data.admin;
        this.hideLoading();
        this.showDashboard();
        this.updateAdminInfo();
      } else {
        throw new Error('인증 실패');
      }
    } catch (error) {
      console.error('인증 확인 오류:', error);
      throw error;
    }
  }

  // 공통 이벤트 바인딩
  bindCommonEvents() {
    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // 네비게이션 활성화
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        this.setActiveNav(e.target);
      });
    });
  }

  // 로딩 화면 숨기기
  hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }
  }

  // 대시보드 표시
  showDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      dashboard.style.display = 'flex';
    }
  }

  // 관리자 정보 업데이트
  updateAdminInfo() {
    const adminName = document.getElementById('adminName');
    if (adminName && this.currentAdmin) {
      adminName.textContent = this.currentAdmin.name || '관리자';
    }
  }

  // 네비게이션 활성화
  updateActiveNav() {
    const currentPath = window.location.pathname;
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href') === currentPath) {
        item.classList.add('active');
      }
    });
  }

  setActiveNav(element) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    element.classList.add('active');
  }

  // 로그아웃 처리
  async handleLogout() {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        window.location.href = '/admin-login.html';
      } else {
        alert('로그아웃 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  }

  // API 호출 유틸리티
  async apiCall(url, options = {}) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        ...options
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API 호출 실패');
      }
      
      return await response.json();
    } catch (error) {
      console.error('API 호출 오류:', error);
      throw error;
    }
  }

  // 토스트 메시지 표시
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 토스트 스타일
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '5000',
      animation: 'slideInRight 0.3s ease'
    });

    // 타입별 색상
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    toast.style.backgroundColor = colors[type] || colors.info;

    document.body.appendChild(toast);

    // 3초 후 자동 제거
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // 모달 열기/닫기 유틸리티
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  // 이미지 크롭 관련 함수들
  openCropperModal(imageSrc, aspectRatio = 1) {
    const modal = document.getElementById('img-cropper-modal');
    const image = document.getElementById('cropper-image');
    
    if (!modal || !image) return;

    image.src = imageSrc;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // 기존 크롭퍼 제거
    if (this.cropper) {
      this.cropper.destroy();
    }

    // 새 크롭퍼 생성
    this.cropper = new Cropper(image, {
      aspectRatio: aspectRatio,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.8,
      restore: false,
      guides: false,
      center: false,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
    });
  }

  closeCropperModal() {
    const modal = document.getElementById('img-cropper-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
    
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
  }

  // 크롭된 이미지 가져오기
  getCroppedImageBlob(quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!this.cropper) {
        reject(new Error('크롭퍼가 초기화되지 않았습니다.'));
        return;
      }

      this.cropper.getCroppedCanvas({
        maxWidth: 1920,
        maxHeight: 1920,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      }).toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('이미지 변환에 실패했습니다.'));
        }
      }, 'image/jpeg', quality);
    });
  }

  // 파일 크기 확인 및 압축
  async compressImage(file, maxSizeKB = 200) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 원본 비율 유지하면서 크기 조정
        const maxWidth = 1920;
        const maxHeight = 1920;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height);

        // 품질 조정하여 압축
        let quality = 0.9;
        const compress = () => {
          canvas.toBlob((blob) => {
            if (blob.size <= maxSizeKB * 1024 || quality <= 0.1) {
              resolve(blob);
            } else {
              quality -= 0.1;
              compress();
            }
          }, 'image/jpeg', quality);
        };

        compress();
      };

      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = URL.createObjectURL(file);
    });
  }

  // 폼 데이터 직렬화
  serializeForm(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      if (data[key]) {
        // 배열인 경우
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }
    
    return data;
  }

  // 페이지네이션 렌더링
  renderPagination(currentPage, totalPages, onPageChange) {
    const container = document.getElementById('pagination');
    if (!container) return;

    let html = '<div class="pagination">';
    
    // 이전 페이지
    if (currentPage > 1) {
      html += `<button class="page-btn" data-page="${currentPage - 1}">이전</button>`;
    }
    
    // 페이지 번호들
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === currentPage ? 'active' : '';
      html += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }
    
    // 다음 페이지
    if (currentPage < totalPages) {
      html += `<button class="page-btn" data-page="${currentPage + 1}">다음</button>`;
    }
    
    html += '</div>';
    container.innerHTML = html;
    
    // 이벤트 리스너 추가
    container.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.dataset.page);
        onPageChange(page);
      });
    });
  }

  // 로딩 상태 표시
  showLoading(element) {
    if (element) {
      element.innerHTML = '<div class="loading-spinner"></div>';
    }
  }

  hideLoading(element) {
    if (element) {
      element.innerHTML = '';
    }
  }
}

// 전역 함수들 (기존 코드와의 호환성을 위해)
function closeCropperModal() {
  if (window.adminCommon) {
    window.adminCommon.closeCropperModal();
  }
}

// 전역 인스턴스 생성
window.adminCommon = new AdminCommon();

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .pagination {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 20px 0;
  }
  
  .page-btn {
    padding: 8px 12px;
    border: 1px solid var(--filo-border);
    background: white;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .page-btn:hover {
    background: var(--filo-mint-light);
    border-color: var(--filo-mint);
  }
  
  .page-btn.active {
    background: var(--filo-mint);
    color: white;
    border-color: var(--filo-mint);
  }
`;
document.head.appendChild(style);

