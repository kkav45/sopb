// js/services/gantt-service.js

class GanttService {
  constructor() {
    this.currentDate = new Date();
    this.currentYear = this.currentDate.getFullYear();
    this.currentMonth = this.currentDate.getMonth();
    this.daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
  }

  // Рендеринг календаря
  renderCalendar(containerId, inspections, equipment) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Обновляем заголовок
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    
    document.getElementById('currentMonthLabel').textContent = 
      `${monthNames[this.currentMonth]} ${this.currentYear}`;

    // Обновляем количество дней
    this.daysInMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();

    // Генерируем шапку
    let html = this.renderHeader();
    
    // Генерируем строки для каждого оборудования
    const equipmentWithInspections = this.groupInspectionsByEquipment(inspections, equipment);
    
    equipmentWithInspections.forEach(eq => {
      html += this.renderEquipmentRow(eq);
    });

    // Добавляем легенду
    html += this.renderLegend();

    container.innerHTML = html;

    // Навешиваем обработчики на бары
    container.querySelectorAll('.gantt-bar').forEach(bar => {
      bar.addEventListener('click', () => {
        const inspectionId = bar.dataset.inspectionId;
        if (window.app && inspectionId) {
          window.app.viewAct(inspectionId);
        }
      });
    });
  }

  // Шапка календаря (дни месяца)
  renderHeader() {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === this.currentYear && 
                           today.getMonth() === this.currentMonth;

    let html = '<div class="gantt-header"><div class="gantt-header-cell">Оборудование</div>';
    
    for (let day = 1; day <= this.daysInMonth; day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = isCurrentMonth && day === today.getDate();
      
      let classes = 'gantt-header-cell';
      if (isWeekend) classes += ' weekend';
      if (isToday) classes += ' today';
      
      html += `<div class="${classes}">${day}</div>`;
    }
    
    html += '</div>';
    return html;
  }

  // Строка оборудования
  renderEquipmentRow(eq) {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === this.currentYear && 
                           today.getMonth() === this.currentMonth;

    let html = `<div class="gantt-row">`;
    html += `<div class="gantt-label" title="${eq.name}">${this.truncate(eq.name, 25)}</div>`;
    
    // Ячейки дней
    for (let day = 1; day <= this.daysInMonth; day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = isCurrentMonth && day === today.getDate();
      
      let classes = 'gantt-cell';
      if (isWeekend) classes += ' weekend';
      if (isToday) classes += ' today';
      
      html += `<div class="${classes}"></div>`;
    }
    
    html += '</div>';
    
    // Полосы проверок
    if (eq.inspections && eq.inspections.length > 0) {
      eq.inspections.forEach(insp => {
        html += this.renderInspectionBar(insp, eq);
      });
    }
    
    // Плановые проверки
    const plannedInspections = this.getPlannedInspections(eq);
    plannedInspections.forEach(insp => {
      html += this.renderInspectionBar(insp, eq, true);
    });

    return html;
  }

  // Полоса проверки
  renderInspectionBar(inspection, equipment, isPlanned = false) {
    const date = new Date(inspection.plannedDate || inspection.completedAt || inspection.createdAt);
    const day = date.getDate();
    
    // Позиционирование
    const gridColumnStart = day + 1; // +1 для колонки с названием
    const gridColumnEnd = gridColumnStart + Math.min(3, this.daysInMonth - day + 1);
    
    // Статус
    let statusClass = 'scheduled';
    let statusText = 'Запланировано';
    
    if (inspection.status === 'completed') {
      statusClass = 'completed';
      statusText = 'Выполнено';
    } else if (inspection.status === 'overdue') {
      statusClass = 'overdue';
      statusText = 'Просрочено';
    } else if (!isPlanned && date < new Date()) {
      statusClass = 'overdue';
      statusText = 'Просрочено';
    } else if (!isPlanned) {
      statusClass = 'pending';
      statusText = 'Ожидается';
    }
    
    const typeName = this.getTypeName(inspection.type);
    
    return `
      <div class="gantt-bar ${statusClass}" 
           data-inspection-id="${inspection.id || ''}"
           style="grid-column: ${gridColumnStart} / ${gridColumnEnd};"
           title="${typeName}
${statusText}
${date.toLocaleDateString('ru-RU')}">
        ${typeName}
      </div>
    `;
  }

  // Легенда
  renderLegend() {
    return `
      <div class="gantt-legend">
        <div class="gantt-legend-item">
          <div class="gantt-legend-color" style="background: linear-gradient(135deg, #28a745, #20c997);"></div>
          <span>Выполнено</span>
        </div>
        <div class="gantt-legend-item">
          <div class="gantt-legend-color" style="background: linear-gradient(135deg, #ffc107, #ff9800);"></div>
          <span>Ожидается</span>
        </div>
        <div class="gantt-legend-item">
          <div class="gantt-legend-color" style="background: linear-gradient(135deg, #dc3545, #c82333);"></div>
          <span>Просрочено</span>
        </div>
        <div class="gantt-legend-item">
          <div class="gantt-legend-color" style="background: linear-gradient(135deg, #17a2b8, #138496);"></div>
          <span>Запланировано</span>
        </div>
      </div>
    `;
  }

  // Группировка проверок по оборудованию
  groupInspectionsByEquipment(inspections, equipment) {
    return equipment.map(eq => {
      const eqInspections = inspections.filter(i => i.equipmentId === eq.id);
      return {
        id: eq.id,
        name: eq.model || eq.typeName || 'Оборудование',
        inspections: eqInspections
      };
    }).filter(eq => eq.inspections.length > 0);
  }

  // Плановые проверки
  getPlannedInspections(equipment) {
    if (!window.app) return [];
    
    const planned = [];
    const today = new Date();
    
    // Простая логика: если нет проверок в этом месяце, добавляем плановую
    const monthInspections = equipment.inspections?.filter(i => {
      const date = new Date(i.completedAt || i.createdAt);
      return date.getFullYear() === this.currentYear && 
             date.getMonth() === this.currentMonth;
    }) || [];
    
    if (monthInspections.length === 0) {
      // Добавляем плановую проверку на середину месяца
      planned.push({
        id: null,
        type: 'scheduled',
        plannedDate: new Date(this.currentYear, this.currentMonth, 15),
        equipmentId: equipment.id
      });
    }
    
    return planned;
  }

  // Навигация
  prevMonth() {
    this.currentMonth--;
    if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    }
  }

  goToToday() {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
  }

  // Вспомогательные методы
  truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }

  getTypeName(type) {
    const types = {
      monthly: 'Ежемесячная',
      quarterly: 'Ежеквартальная',
      annual: 'Ежегодная',
      extra: 'Внеплановая',
      scheduled: 'Плановая'
    };
    return types[type] || type || 'Проверка';
  }
}

// Глобальный сервис
window.ganttService = new GanttService();
