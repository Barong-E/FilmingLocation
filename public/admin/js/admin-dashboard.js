// 관리자 대시보드 페이지 스크립트
// - 통계 카드 로딩
// - 트렌드 차트 렌더링(Chart.js)
// - SSE로 실시간 통계 갱신

(function () {
  let trendChart = null;

  function qs(id) { return document.getElementById(id); }

  async function loadStats() {
    try {
      const data = await window.adminCommon.apiCall('/api/admin/dashboard/stats');
      const s = data.stats || {};

      const safeText = (el, value) => { if (el) el.textContent = String(value ?? 0); };
      safeText(qs('totalUsers'), s.users);
      safeText(qs('totalPlaces'), s.places);
      safeText(qs('totalWorks'), s.works);
      safeText(qs('totalCharacters'), s.characters);

      // 최근 활동 간단 렌더
      const list = qs('activityList');
      if (list && data.recentActivity) {
        const { users = [], comments = [], adminLogs = [] } = data.recentActivity;
        const items = [];
        users.forEach(u => items.push({
          type: '사용자',
          time: u.createdAt,
          text: `${u.displayName || '사용자'} 가입`
        }));
        comments.forEach(c => items.push({
          type: '댓글',
          time: c.createdAt,
          text: `${c.userId?.displayName || '익명'}: ${String(c.content || '').slice(0, 40)}`
        }));
        adminLogs.forEach(l => items.push({
          type: '관리자',
          time: l.timestamp,
          text: `${l.adminId?.displayName || l.adminId?.username || '관리자'} ${l.action}`
        }));

        items.sort((a, b) => new Date(b.time) - new Date(a.time));
        const limited = items.slice(0, 15);
        list.innerHTML = limited.map(i => (
          `<div class="activity-item">
            <span class="badge">${i.type}</span>
            <span class="text">${escapeHtml(i.text)}</span>
            <span class="time">${formatTime(i.time)}</span>
          </div>`
        )).join('');
      }
    } catch (e) {
      console.error('[dashboard] 통계 로딩 실패', e);
      window.adminCommon.showToast('대시보드 통계 로딩 실패', 'error');
    }
  }

  async function loadTrends(days) {
    try {
      const data = await window.adminCommon.apiCall(`/api/admin/dashboard/trends?days=${encodeURIComponent(days)}`);
      const labels = data.labels || [];
      const series = data.series || { users: [], comments: [] };
      renderTrendChart(labels, series);
    } catch (e) {
      console.error('[dashboard] 트렌드 로딩 실패', e);
      window.adminCommon.showToast('트렌드 데이터 로딩 실패', 'error');
    }
  }

  function renderTrendChart(labels, series) {
    const ctx = qs('trendChart');
    if (!ctx) return;

    const data = {
      labels,
      datasets: [
        {
          label: '신규 사용자',
          data: series.users || [],
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.15)',
          tension: 0.3,
          fill: true,
        },
        {
          label: '신규 댓글',
          data: series.comments || [],
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.15)',
          tension: 0.3,
          fill: true,
        }
      ]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { mode: 'index', intersect: false }
      },
      interaction: { mode: 'index', intersect: false },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { ticks: { maxRotation: 0 } }
      }
    };

    if (trendChart) {
      trendChart.data = data;
      trendChart.options = options;
      trendChart.update();
    } else {
      trendChart = new Chart(ctx, { type: 'line', data, options });
    }
  }

  function bindEvents() {
    const period = qs('trendPeriod');
    if (period && !period._bound) {
      period._bound = true;
      period.addEventListener('change', () => loadTrends(period.value));
    }

    // 활동 탭 필터링 기능
    document.querySelectorAll('.activity-tab').forEach(btn => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.activity-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 필터링 적용
        const filterType = btn.dataset.activity;
        filterActivityList(filterType);
      });
    });
  }

  function filterActivityList(filterType) {
    const list = qs('activityList');
    if (!list) return;

    const items = list.querySelectorAll('.activity-item');
    items.forEach(item => {
      const badge = item.querySelector('.badge');
      if (!badge) return;

      const itemType = badge.textContent.trim();
      let shouldShow = true;

      if (filterType === 'users') {
        shouldShow = itemType === '사용자';
      } else if (filterType === 'comments') {
        shouldShow = itemType === '댓글';
      } else if (filterType === 'admin') {
        shouldShow = itemType === '관리자';
      }
      // filterType === 'all'이면 모든 항목 표시

      item.style.display = shouldShow ? '' : 'none';
    });
  }

  function startSSE() {
    try {
      if (!('EventSource' in window)) return;
      const es = new EventSource('/api/admin/dashboard/stream');
      es.addEventListener('stats', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data) {
            if (qs('totalUsers')) qs('totalUsers').textContent = String(data.users ?? 0);
            if (qs('totalPlaces')) qs('totalPlaces').textContent = String(data.places ?? 0);
            if (qs('totalWorks')) qs('totalWorks').textContent = String(data.works ?? 0);
            if (qs('totalCharacters')) qs('totalCharacters').textContent = String(data.characters ?? 0);
          }
        } catch (_) {}
      });
    } catch (e) {
      console.warn('[dashboard] SSE 사용 불가', e);
    }
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatTime(t) {
    if (!t) return '';
    const d = new Date(t);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  }

  // 이 파일이 로드될 때 자동으로 AdminDashboard 인스턴스를 생성하던 로직을 제거합니다.
  // 이제 각 HTML 페이지가 명시적으로 초기화를 제어합니다.
  document.addEventListener('DOMContentLoaded', () => {
    try {
      if (window.location && window.location.pathname === '/admin/dashboard') {
        setTimeout(async () => {
          bindEvents();
          await loadStats();
          const period = qs('trendPeriod');
          await loadTrends(period ? period.value : 30);
          startSSE();
          try { window.adminCommon?.showDashboard?.(); } catch(_) {}
        }, 0);
      }
    } catch (_) {}
  });
  
})();


