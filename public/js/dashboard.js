// 📊 FiLo 검색 통계 대시보드

class SearchDashboard {
  constructor() {
    this.charts = {};
    this.refreshInterval = null;
    this.isLoading = false;
    
    console.log('📊 검색 통계 대시보드 초기화');
  }

  // 대시보드 초기화
  async init() {
    try {
      // 이벤트 리스너 설정
      this.setupEventListeners();
      
      // 초기 데이터 로드
      await this.loadAllData();
      
      // 차트 초기화
      this.initializeCharts();
      
      // 자동 새로고침 설정 (30초마다)
      this.startAutoRefresh();
      
      console.log('✅ 대시보드 초기화 완료');
    } catch (error) {
      console.error('❌ 대시보드 초기화 실패:', error);
      this.showError('대시보드 초기화에 실패했습니다.');
    }
  }

  // 이벤트 리스너 설정
  setupEventListeners() {
    // 새로고침 버튼
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      this.loadAllData();
    });

    // 내보내기 버튼
    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.exportData();
    });

    // 시간 범위 선택
    document.getElementById('time-range-select')?.addEventListener('change', (e) => {
      this.updateTimeRangeChart(e.target.value);
    });

    // 느린 쿼리 지우기
    document.getElementById('clear-slow-queries')?.addEventListener('click', () => {
      this.clearSlowQueries();
    });

    // 오류 지우기
    document.getElementById('clear-errors')?.addEventListener('click', () => {
      this.clearErrors();
    });
  }

  // 모든 데이터 로드
  async loadAllData() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading(true);

    try {
      // 병렬로 데이터 로드
      const [searchStats, cacheStats] = await Promise.all([
        this.fetchSearchStats(),
        this.fetchCacheStats()
      ]);

      // UI 업데이트
      this.updateMetrics(searchStats, cacheStats);
      this.updateCharts(searchStats);
      this.updateTables(searchStats);
      this.updateSystemStatus(searchStats, cacheStats);

    } catch (error) {
      console.error('❌ 데이터 로드 실패:', error);
      this.showError('데이터 로드에 실패했습니다.');
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  // 검색 통계 API 호출
  async fetchSearchStats() {
    const response = await fetch('/api/search/monitor/stats');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // 캐시 통계 API 호출
  async fetchCacheStats() {
    const response = await fetch('/api/search/cache/stats');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }

  // 주요 지표 업데이트
  updateMetrics(searchStats, cacheStats) {
    const search = searchStats.search || {};
    const cache = cacheStats || {};

    // 총 검색 요청
    this.updateMetric('total-requests', search.totalRequests || 0, '+12%', 'positive');

    // 캐시 히트율
    const hitRate = cache.total?.hitRate || 0;
    this.updateMetric('cache-hit-rate', `${hitRate}%`, '+5%', 'positive');

    // 평균 응답시간
    const avgTime = search.averageResponseTime || 0;
    this.updateMetric('avg-response-time', `${avgTime}ms`, '-8%', 'positive');

    // 오류율
    const errorRate = search.totalRequests > 0 ? 
      ((search.errorCount / search.totalRequests) * 100).toFixed(2) : 0;
    this.updateMetric('error-rate', `${errorRate}%`, '-2%', 'positive');
  }

  // 개별 지표 업데이트
  updateMetric(id, value, change, trend) {
    const valueEl = document.getElementById(id);
    const changeEl = document.getElementById(id.replace('-', '-change').replace('requests', 'requests'));
    
    if (valueEl) valueEl.textContent = value;
    if (changeEl) {
      changeEl.textContent = change;
      changeEl.className = `metric-change ${trend}`;
    }
  }

  // 차트 초기화
  initializeCharts() {
    this.initRequestsChart();
    this.initTypesChart();
    this.initPopularQueriesChart();
    this.initResponseTimeChart();
  }

  // 시간별 검색 요청 차트
  initRequestsChart() {
    const ctx = document.getElementById('requests-chart')?.getContext('2d');
    if (!ctx) return;

    this.charts.requests = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '검색 요청',
          data: [],
          borderColor: '#00c896',
          backgroundColor: 'rgba(0, 200, 150, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          x: {
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          }
        }
      }
    });
  }

  // 검색 타입별 분포 차트
  initTypesChart() {
    const ctx = document.getElementById('types-chart')?.getContext('2d');
    if (!ctx) return;

    this.charts.types = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['장소', '작품', '인물'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: [
            '#17a2b8',
            '#dc3545',
            '#28a745'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  // 인기 검색어 차트
  initPopularQueriesChart() {
    const ctx = document.getElementById('popular-queries-chart')?.getContext('2d');
    if (!ctx) return;

    this.charts.popularQueries = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: '검색 횟수',
          data: [],
          backgroundColor: 'rgba(255, 193, 7, 0.8)',
          borderColor: '#ffc107',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          y: {
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          }
        }
      }
    });
  }

  // 응답시간 분포 차트
  initResponseTimeChart() {
    const ctx = document.getElementById('response-time-chart')?.getContext('2d');
    if (!ctx) return;

    this.charts.responseTime = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['< 100ms', '100-300ms', '300-500ms', '500ms-1s', '> 1s'],
        datasets: [{
          label: '요청 수',
          data: [0, 0, 0, 0, 0],
          backgroundColor: [
            '#28a745',
            '#ffc107',
            '#fd7e14',
            '#dc3545',
            '#6f42c1'
          ],
          borderWidth: 1,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          x: {
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          }
        }
      }
    });
  }

  // 차트 데이터 업데이트
  updateCharts(searchStats) {
    const search = searchStats.search || {};
    
    // 시간별 요청 차트 업데이트
    this.updateRequestsChart(search.hourlyStats || {});
    
    // 타입별 분포 차트 업데이트
    this.updateTypesChart(search);
    
    // 인기 검색어 차트 업데이트
    this.updatePopularQueriesChart(search.popularQueries || {});
    
    // 응답시간 분포 차트 업데이트
    this.updateResponseTimeChart(search);
  }

  // 시간별 요청 차트 데이터 업데이트
  updateRequestsChart(hourlyStats) {
    if (!this.charts.requests) return;

    const now = new Date();
    const labels = [];
    const data = [];

    // 최근 24시간 데이터 생성
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hour.getHours();
      labels.push(`${hourKey}:00`);
      data.push(hourlyStats[hourKey] || 0);
    }

    this.charts.requests.data.labels = labels;
    this.charts.requests.data.datasets[0].data = data;
    this.charts.requests.update();
  }

  // 타입별 분포 차트 업데이트
  updateTypesChart(search) {
    if (!this.charts.types) return;

    // 임시 데이터 (실제로는 API에서 받아야 함)
    const total = search.totalRequests || 1;
    this.charts.types.data.datasets[0].data = [
      Math.floor(total * 0.4), // 장소
      Math.floor(total * 0.35), // 작품
      Math.floor(total * 0.25)  // 인물
    ];
    this.charts.types.update();
  }

  // 인기 검색어 차트 업데이트
  updatePopularQueriesChart(popularQueries) {
    if (!this.charts.popularQueries) return;

    const entries = Object.entries(popularQueries).slice(0, 10);
    const labels = entries.map(([query]) => query.length > 10 ? query.substring(0, 10) + '...' : query);
    const data = entries.map(([, count]) => count);

    this.charts.popularQueries.data.labels = labels;
    this.charts.popularQueries.data.datasets[0].data = data;
    this.charts.popularQueries.update();
  }

  // 응답시간 분포 차트 업데이트
  updateResponseTimeChart(search) {
    if (!this.charts.responseTime) return;

    // 임시 데이터 (실제로는 slowQueries에서 분석해야 함)
    const slowQueries = search.slowQueries || [];
    const distribution = [0, 0, 0, 0, 0];
    
    slowQueries.forEach(query => {
      const time = query.responseTime || 0;
      if (time < 100) distribution[0]++;
      else if (time < 300) distribution[1]++;
      else if (time < 500) distribution[2]++;
      else if (time < 1000) distribution[3]++;
      else distribution[4]++;
    });

    this.charts.responseTime.data.datasets[0].data = distribution;
    this.charts.responseTime.update();
  }

  // 테이블 업데이트
  updateTables(searchStats) {
    const search = searchStats.search || {};
    
    this.updateSlowQueriesTable(search.slowQueries || []);
    this.updateErrorsTable(search.errorLog || []);
  }

  // 느린 쿼리 테이블 업데이트
  updateSlowQueriesTable(slowQueries) {
    const tbody = document.querySelector('#slow-queries-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    slowQueries.slice(0, 10).forEach(query => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${this.escapeHtml(query.query || '-')}</td>
        <td>${this.escapeHtml(query.endpoint || '-')}</td>
        <td><span class="response-time ${query.responseTime > 1000 ? 'slow' : ''}">${query.responseTime}ms</span></td>
        <td>${this.formatTime(query.timestamp)}</td>
      `;
    });

    if (slowQueries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">데이터가 없습니다.</td></tr>';
    }
  }

  // 오류 테이블 업데이트
  updateErrorsTable(errorLog) {
    const tbody = document.querySelector('#errors-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    errorLog.slice(0, 10).forEach(error => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${this.escapeHtml(error.message || '-')}</td>
        <td>${this.escapeHtml(error.endpoint || '-')}</td>
        <td>${this.formatTime(error.timestamp)}</td>
      `;
    });

    if (errorLog.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #999;">오류가 없습니다.</td></tr>';
    }
  }

  // 시스템 상태 업데이트
  updateSystemStatus(searchStats, cacheStats) {
    const server = searchStats.server || {};
    const cache = cacheStats || {};

    // 서버 상태
    this.updateStatusValue('server-uptime', this.formatUptime(server.uptime));
    this.updateStatusValue('memory-usage', this.formatMemory(server.memory));
    this.updateStatusValue('redis-status', cache.redis?.connected ? '✅ 연결됨' : '❌ 연결 안됨');
    this.updateStatusValue('cache-size', `${cache.memory?.size || 0} / ${cache.memory?.maxSize || 0}`);

    // 캐시 통계
    this.updateStatusValue('redis-hits', cache.redis?.hits || 0);
    this.updateStatusValue('memory-hits', cache.memory?.hits || 0);
    this.updateStatusValue('total-misses', (cache.redis?.misses || 0) + (cache.memory?.misses || 0));
    this.updateStatusValue('cache-errors', cache.redis?.errors || 0);
  }

  // 상태 값 업데이트
  updateStatusValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  // 유틸리티 함수들
  formatTime(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatUptime(seconds) {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}시간 ${minutes}분`;
  }

  formatMemory(memoryObj) {
    if (!memoryObj) return '-';
    const used = Math.round(memoryObj.heapUsed / 1024 / 1024);
    const total = Math.round(memoryObj.heapTotal / 1024 / 1024);
    return `${used}MB / ${total}MB`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 로딩 상태 표시
  showLoading(show) {
    const container = document.getElementById('dashboard-container');
    if (container) {
      container.classList.toggle('loading', show);
    }
  }

  // 오류 메시지 표시
  showError(message) {
    // 간단한 알림 (실제로는 토스트 메시지 등으로 대체 가능)
    alert(`오류: ${message}`);
  }

  // 자동 새로고침 시작
  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadAllData();
    }, 30000); // 30초마다
  }

  // 자동 새로고침 중지
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  // 데이터 내보내기
  async exportData() {
    try {
      const [searchStats, cacheStats] = await Promise.all([
        this.fetchSearchStats(),
        this.fetchCacheStats()
      ]);

      const exportData = {
        timestamp: new Date().toISOString(),
        searchStats,
        cacheStats
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filo-dashboard-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ 데이터 내보내기 실패:', error);
      this.showError('데이터 내보내기에 실패했습니다.');
    }
  }

  // 느린 쿼리 지우기
  async clearSlowQueries() {
    try {
      const response = await fetch('/api/search/monitor/reset', { method: 'DELETE' });
      if (response.ok) {
        await this.loadAllData();
        console.log('✅ 느린 쿼리 초기화 완료');
      }
    } catch (error) {
      console.error('❌ 느린 쿼리 초기화 실패:', error);
      this.showError('느린 쿼리 초기화에 실패했습니다.');
    }
  }

  // 오류 지우기
  async clearErrors() {
    try {
      const response = await fetch('/api/search/monitor/reset', { method: 'DELETE' });
      if (response.ok) {
        await this.loadAllData();
        console.log('✅ 오류 로그 초기화 완료');
      }
    } catch (error) {
      console.error('❌ 오류 로그 초기화 실패:', error);
      this.showError('오류 로그 초기화에 실패했습니다.');
    }
  }

  // 시간 범위 차트 업데이트
  updateTimeRangeChart(range) {
    console.log(`📊 시간 범위 변경: ${range}`);
    // TODO: 실제 구현에서는 API를 호출해서 해당 범위의 데이터를 가져와야 함
    this.loadAllData();
  }

  // 정리
  destroy() {
    this.stopAutoRefresh();
    
    // 차트 정리
    Object.values(this.charts).forEach(chart => {
      if (chart && chart.destroy) {
        chart.destroy();
      }
    });
    
    console.log('📊 대시보드 정리 완료');
  }
}

// 대시보드 인스턴스 생성 및 초기화
const dashboard = new SearchDashboard();

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
  dashboard.init();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
  dashboard.destroy();
});

// 전역 접근을 위한 export
window.searchDashboard = dashboard;

