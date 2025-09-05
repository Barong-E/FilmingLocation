// 대시보드 페이지 JavaScript
class AdminDashboard {
  constructor() {
    this.init();
  }
  
  // 초기화
  async init() {
    try {
      // 이벤트 리스너 등록
      this.bindEvents();
      
      // 초기 데이터 로드
      await this.loadDashboardData();
      
    } catch (error) {
      console.error('대시보드 초기화 오류:', error);
    }
  }
  
  // 이벤트 리스너 등록
  bindEvents() {
    // 차트 기간 변경
    document.getElementById('trendPeriod').addEventListener('change', (e) => {
      this.loadTrends(parseInt(e.target.value));
    });

    // 활동 탭 클릭
    document.querySelectorAll('.activity-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchActivityTab(e.target.dataset.activity);
      });
    });
  }
  
  // 대시보드 데이터 로드
  async loadDashboardData() {
    try {
      // 통계 데이터 로드
      await this.loadStats();
      
      // 차트 데이터 로드
      await this.loadTrends(30);
      
      // 최근 활동 로드
      await this.loadRecentActivity();
      
    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
    }
  }
  
  // 통계 데이터 로드
  async loadStats() {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.updateStats(data.stats);
      }
    } catch (error) {
      console.error('통계 로드 오류:', error);
    }
  }
  
  // 통계 업데이트
  updateStats(stats) {
    document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
    document.getElementById('totalPlaces').textContent = stats.totalPlaces || 0;
    document.getElementById('totalWorks').textContent = stats.totalWorks || 0;
    document.getElementById('totalCharacters').textContent = stats.totalCharacters || 0;
  }
  
  // 트렌드 데이터 로드
  async loadTrends(days) {
    try {
      const response = await fetch(`/api/admin/dashboard/trends?days=${days}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderTrendChart(data.trends);
      }
    } catch (error) {
      console.error('트렌드 로드 오류:', error);
    }
  }
  
  // 트렌드 차트 렌더링
  renderTrendChart(trends) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // 기존 차트 제거
    if (this.trendChart) {
      this.trendChart.destroy();
    }
    
    this.trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trends.map(t => t.date),
        datasets: [
          {
            label: '사용자',
            data: trends.map(t => t.users),
            borderColor: '#00c896',
            backgroundColor: 'rgba(0, 200, 150, 0.1)',
            tension: 0.4
          },
          {
            label: '댓글',
            data: trends.map(t => t.comments),
            borderColor: '#ff6b6b',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: '일별 활동 통계'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
  
  // 최근 활동 로드
  async loadRecentActivity() {
    try {
      const response = await fetch('/api/admin/logs?page=1&limit=10', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderRecentActivity(data.logs);
      }
    } catch (error) {
      console.error('최근 활동 로드 오류:', error);
    }
  }
  
  // 최근 활동 렌더링
  renderRecentActivity(logs) {
    const container = document.getElementById('activityList');
    container.innerHTML = logs.map(log => `
      <div class="activity-item">
        <div class="activity-info">
          <div class="activity-title">${log.adminId?.displayName || log.adminUsername}</div>
          <div class="activity-time">${log.description}</div>
        </div>
      </div>
    `).join('');
  }
  
  // 활동 탭 전환
  switchActivityTab(activityType) {
    document.querySelectorAll('.activity-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-activity="${activityType}"]`).classList.add('active');
    
    // 활동 타입별 필터링 로직 (필요시 구현)
    this.loadRecentActivity(activityType);
  }
}

// 전역 인스턴스 생성
window.adminDashboard = new AdminDashboard();

