// js/services/chart-service.js

class ChartService {
  constructor() {
    this.charts = {};
    this.loaded = false;
  }

  // Загрузка Chart.js
  async load() {
    if (this.loaded) return;

    return new Promise((resolve, reject) => {
      if (window.Chart) {
        this.loaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      script.onload = () => {
        this.loaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Создание круговой диаграммы
  async createPieChart(canvasId, data, options = {}) {
    await this.load();

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // Уничтожаем существующий график если есть
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
      delete this.charts[canvasId];
    }

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            font: { size: 12 }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    };

    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: data.colors || this.getDefaultColors(),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: { ...defaultOptions, ...options }
    });

    return this.charts[canvasId];
  }

  // Создание столбчатой диаграммы
  async createBarChart(canvasId, data, options = {}) {
    await this.load();

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // Уничтожаем существующий график если есть
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
      delete this.charts[canvasId];
    }

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: data.datasets.length > 1,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    };

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: data.datasets.map((dataset, index) => ({
          ...dataset,
          backgroundColor: dataset.color || this.getDefaultColors()[index % this.getDefaultColors().length],
          borderRadius: 4
        }))
      },
      options: { ...defaultOptions, ...options }
    });

    return this.charts[canvasId];
  }

  // Создание линейного графика
  async createLineChart(canvasId, data, options = {}) {
    await this.load();

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // Уничтожаем существующий график если есть
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
      delete this.charts[canvasId];
    }

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: data.datasets.map((dataset, index) => ({
          ...dataset,
          borderColor: dataset.color || this.getDefaultColors()[index % this.getDefaultColors().length],
          backgroundColor: dataset.color || this.getDefaultColors()[index % this.getDefaultColors().length],
          tension: 0.3,
          fill: false
        }))
      },
      options: { ...defaultOptions, ...options }
    });

    return this.charts[canvasId];
  }

  // Создание диаграммы прогресса
  async createProgressChart(canvasId, value, label = '') {
    await this.load();

    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    // Уничтожаем существующий график если есть
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
      delete this.charts[canvasId];
    }

    const percentage = Math.min(100, Math.max(0, value));
    const color = this.getProgressColor(percentage);

    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [label || 'Прогресс', 'Остаток'],
        datasets: [{
          data: [percentage, 100 - percentage],
          backgroundColor: [color, '#e0e0e0'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });

    return this.charts[canvasId];
  }

  // Обновление существующего графика
  updateChart(canvasId, newData) {
    const chart = this.charts[canvasId];
    if (!chart) return;

    if (newData.labels) {
      chart.data.labels = newData.labels;
    }

    if (newData.datasets) {
      newData.datasets.forEach((dataset, index) => {
        if (chart.data.datasets[index]) {
          chart.data.datasets[index].data = dataset.data;
        }
      });
    }

    chart.update();
  }

  // Уничтожение графика
  destroyChart(canvasId) {
    const chart = this.charts[canvasId];
    if (chart) {
      chart.destroy();
      delete this.charts[canvasId];
    }
  }

  // Уничтожение всех графиков
  destroyAll() {
    Object.keys(this.charts).forEach(canvasId => {
      this.destroyChart(canvasId);
    });
  }

  // Цвета по умолчанию
  getDefaultColors() {
    return [
      '#28a745', // зелёный
      '#ffc107', // жёлтый
      '#dc3545', // красный
      '#17a2b8', // голубой
      '#6f42c1', // фиолетовый
      '#fd7e14', // оранжевый
      '#20c997', // бирюзовый
      '#e83e8c'  // розовый
    ];
  }

  // Цвет прогресса
  getProgressColor(percentage) {
    if (percentage >= 80) return '#28a745';
    if (percentage >= 60) return '#ffc107';
    if (percentage >= 40) return '#fd7e14';
    return '#dc3545';
  }

  // Данные для дашборда
  async renderDashboardCharts(stats) {
    // Статус оборудования
    await this.createPieChart('equipmentStatusChart', {
      labels: ['Исправно', 'Требует ТО', 'Неисправно'],
      values: [stats.equipmentActive || 0, stats.equipmentMaintenance || 0, stats.equipmentFaulty || 0],
      colors: ['#28a745', '#ffc107', '#dc3545']
    });

    // Проверки по типам
    await this.createBarChart('inspectionsByTypeChart', {
      labels: ['Ежемесячные', 'Ежеквартальные', 'Ежегодные', 'Внеплановые'],
      datasets: [{
        label: 'Количество проверок',
        data: [
          stats.inspectionsMonthly || 0,
          stats.inspectionsQuarterly || 0,
          stats.inspectionsAnnual || 0,
          stats.inspectionsExtra || 0
        ]
      }]
    });

    // Нарушения по статусам
    await this.createPieChart('violationsStatusChart', {
      labels: ['Новые', 'В работе', 'Устранено', 'Просрочено'],
      values: [
        stats.violationsNew || 0,
        stats.violationsInProgress || 0,
        stats.violationsResolved || 0,
        stats.violationsOverdue || 0
      ],
      colors: ['#17a2b8', '#ffc107', '#28a745', '#dc3545']
    });

    // Прогресс соответствия
    const compliancePercentage = stats.compliancePercentage || this.calculateCompliance(stats);
    await this.createProgressChart('complianceChart', compliancePercentage, 'Соответствие');
  }

  // Расчёт процента соответствия
  calculateCompliance(stats) {
    const total = (stats.equipmentActive || 0) + 
                  (stats.equipmentMaintenance || 0) + 
                  (stats.equipmentFaulty || 0);
    
    if (total === 0) return 0;
    
    const healthy = (stats.equipmentActive || 0) + 
                    ((stats.equipmentMaintenance || 0) * 0.5);
    
    return Math.round((healthy / total) * 100);
  }
}

// Глобальный сервис
window.chartService = new ChartService();
