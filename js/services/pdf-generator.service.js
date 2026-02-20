// js/services/pdf-generator.service.js

class PdfGeneratorService {
  constructor() {
    this.jspdf = null;
    this.loaded = false;
  }

  // Загрузка библиотеки jsPDF
  async load() {
    if (this.loaded) return;
    
    return new Promise((resolve, reject) => {
      if (window.jspdf) {
        this.jspdf = window.jspdf;
        this.loaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => {
        this.jspdf = window.jspdf;
        this.loaded = true;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Генерация акта проверки
  async generateInspectionAct(inspection, equipment, object, checklist) {
    await this.load();
    
    const { jsPDF } = this.jspdf;
    const doc = new jsPDF();
    
    // Заголовок
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('АКТ ПРОВЕРКИ РАБОТОСПОСОБНОСТИ ОБОРУДОВАНИЯ', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`№ ${inspection.id.slice(-6)} от ${formatDate(inspection.completedAt, { year: 'numeric', month: 'long', day: 'numeric' })}`, 105, 30, { align: 'center' });
    
    // Разделительная линия
    doc.line(20, 35, 190, 35);
    
    // 1. Объект
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Объект проверки:', 20, 45);
    doc.setFont('helvetica', 'normal');
    doc.text(`Наименование: ${object?.name || 'Не указан'}`, 20, 53);
    doc.text(`Адрес: ${object?.address || 'Не указан'}`, 20, 60);
    
    // 2. Оборудование
    doc.setFont('helvetica', 'bold');
    doc.text('2. Оборудование:', 20, 72);
    doc.setFont('helvetica', 'normal');
    doc.text(`Тип: ${equipment?.typeName || equipment?.type || 'Не указан'}`, 20, 80);
    doc.text(`Модель: ${equipment?.model || 'Не указана'}`, 20, 87);
    doc.text(`Серийный номер: ${equipment?.serialNumber || 'Не указан'}`, 20, 94);
    doc.text(`Место установки: ${equipment?.location || 'Не указано'}`, 20, 101);
    
    // 3. Тип проверки
    doc.setFont('helvetica', 'bold');
    doc.text('3. Тип проверки:', 20, 113);
    doc.setFont('helvetica', 'normal');
    const typeNames = {
      monthly: 'Ежемесячная',
      quarterly: 'Ежеквартальная',
      annual: 'Ежегодная',
      extra: 'Внеплановая'
    };
    doc.text(`${typeNames[inspection.type] || inspection.type}`, 20, 120);
    
    // 4. Результаты чек-листа
    doc.setFont('helvetica', 'bold');
    doc.text('4. Результаты проверки:', 20, 132);
    
    let y = 140;
    const lineHeight = 7;
    
    if (inspection.results?.items) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      inspection.results.items.forEach((item, index) => {
        const status = item.status === 'pass' ? '✓' : '✕';
        const statusText = item.status === 'pass' ? 'Исправно' : 'Неисправно';
        
        // Проверяем, не выйдет ли за границу страницы
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(`${index + 1}. ${item.title || `Пункт ${index + 1}`}`, 20, y);
        doc.text(`[${status}] ${statusText}`, 180, y, { align: 'right' });
        
        if (item.comment) {
          y += lineHeight;
          doc.setTextColor(100);
          doc.text(`Комментарий: ${item.comment}`, 25, y);
          doc.setTextColor(0);
        }
        
        y += lineHeight * 1.5;
      });
    }
    
    // 5. Общий статус
    y += 5;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('5. Общий результат:', 20, y);
    
    const overallStatus = inspection.results?.overallStatus || 'unknown';
    const statusLabels = {
      pass: 'ИСПРАВНО',
      fail: 'НЕИСПРАВНО',
      unknown: 'ТРЕБУЕТ ПРОВЕРКИ'
    };
    const statusColors = {
      pass: [40, 167, 69],
      fail: [220, 53, 69],
      unknown: [255, 193, 7]
    };
    
    const color = statusColors[overallStatus] || statusColors.unknown;
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(statusLabels[overallStatus] || 'НЕИЗВЕСТНО', 180, y, { align: 'right' });
    doc.setTextColor(0);
    
    // 6. Комментарии
    if (inspection.comment) {
      y += 15;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('6. Дополнительные комментарии:', 20, y);
      doc.setFont('helvetica', 'normal');
      
      const commentLines = doc.splitTextToSize(inspection.comment, 170);
      commentLines.forEach((line, i) => {
        doc.text(line, 20, y + 8 + (i * 5));
      });
    }
    
    // 7. Подписи
    y += 40;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('7. Подписи:', 20, y);
    
    doc.setFont('helvetica', 'normal');
    y += 15;
    
    // Проверяющий
    doc.text('Проверяющий:', 20, y);
    doc.line(100, y - 3, 190, y - 3);
    doc.text('(подпись)', 150, y);
    
    y += 15;
    doc.text('Ответственный:', 20, y);
    doc.line(100, y - 3, 190, y - 3);
    doc.text('(подпись)', 150, y);
    
    // Нижняя информация
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Документ сгенерирован системой АСОПБ ${new Date().toLocaleDateString('ru-RU')}`, 105, 280, { align: 'center' });
    
    // Сохранение
    const filename = `Akt_${inspection.id.slice(-6)}_${formatDate(inspection.completedAt, { year: 'numeric', month: '2-digit', day: '2-digit' })}.pdf`;
    doc.save(filename);
    
    return doc;
  }

  // Генерация отчёта по нарушениям
  async generateViolationsReport(violations, object) {
    await this.load();
    
    const { jsPDF } = this.jspdf;
    const doc = new jsPDF();
    
    // Заголовок
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ОТЧЁТ ПО НАРУШЕНИЯМ ТРЕБОВАНИЙ ПОЖАРНОЙ БЕЗОПАСНОСТИ', 105, 20, { align: 'center' });
    
    if (object?.name) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Объект: ${object.name}`, 105, 30, { align: 'center' });
    }
    
    doc.line(20, 35, 190, 35);
    
    // Статистика
    const stats = {
      total: violations.length,
      new: violations.filter(v => v.status === 'new').length,
      inProgress: violations.filter(v => v.status === 'in_progress').length,
      resolved: violations.filter(v => v.status === 'resolved').length,
      overdue: violations.filter(v => v.status === 'overdue').length
    };
    
    doc.setFontSize(10);
    doc.text(`Всего нарушений: ${stats.total}`, 20, 45);
    doc.text(`Новых: ${stats.new}`, 60, 45);
    doc.text(`В работе: ${stats.inProgress}`, 100, 45);
    doc.text(`Устранено: ${stats.resolved}`, 140, 45);
    doc.text(`Просрочено: ${stats.overdue}`, 180, 45, { align: 'right' });
    
    // Таблица нарушений
    let y = 55;
    doc.setFontSize(9);
    
    // Заголовки таблицы
    doc.setFont('helvetica', 'bold');
    doc.text('№', 20, y);
    doc.text('Описание', 30, y);
    doc.text('Статья', 100, y);
    doc.text('Статус', 140, y);
    doc.text('Срок', 170, y);
    
    y += 5;
    doc.line(20, y, 190, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    
    violations.forEach((viol, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      
      const num = index + 1;
      const desc = doc.splitTextToSize(viol.description || '', 65);
      const article = viol.koapArticle || '-';
      const status = this.getStatusLabel(viol.status);
      const deadline = viol.deadline ? formatDate(viol.deadline, { month: '2-digit', day: '2-digit' }) : '-';
      
      doc.text(String(num), 20, y);
      doc.text(desc, 30, y);
      doc.text(article, 100, y);
      doc.text(status, 140, y);
      doc.text(deadline, 170, y);
      
      y += 8 + (desc.length * 3);
    });
    
    // Сохранение
    const filename = `Narusheniya_${object?.id || 'report'}_${new Date().toLocaleDateString('ru-RU')}.pdf`;
    doc.save(filename);
    
    return doc;
  }

  getStatusLabel(status) {
    const labels = {
      new: 'Новое',
      in_progress: 'В работе',
      resolved: 'Устранено',
      overdue: 'Просрочено'
    };
    return labels[status] || status;
  }

  // Генерация журнала эксплуатации
  async generateJournal(inspections, period) {
    await this.load();
    
    const { jsPDF } = this.jspdf;
    const doc = new jsPDF('landscape');
    
    // Заголовок
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ЖУРНАЛ ЭКСПЛУАТАЦИИ СИСТЕМ ПРОТИВОПОЖАРНОЙ ЗАЩИТЫ', 145, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Период: ${period || new Date().toLocaleDateString('ru-RU')}`, 145, 22, { align: 'center' });
    
    // Таблица
    doc.setFontSize(8);
    let y = 30;
    
    // Заголовки
    doc.setFont('helvetica', 'bold');
    doc.text('Дата', 10, y);
    doc.text('Время', 30, y);
    doc.text('Объект', 50, y);
    doc.text('Оборудование', 90, y);
    doc.text('Тип проверки', 140, y);
    doc.text('Результат', 180, y);
    doc.text('Исполнитель', 210, y);
    
    y += 5;
    doc.line(10, y, 285, y);
    y += 5;
    
    doc.setFont('helvetica', 'normal');
    
    inspections.forEach(insp => {
      if (y > 195) {
        doc.addPage();
        y = 20;
      }
      
      const date = formatDate(insp.completedAt || insp.createdAt, { day: '2-digit', month: '2-digit', year: '2-digit' });
      const time = formatDate(insp.completedAt || insp.createdAt, { hour: '2-digit', minute: '2-digit' });
      const result = insp.results?.overallStatus === 'pass' ? '✓' : '✕';
      
      doc.text(date, 10, y);
      doc.text(time, 30, y);
      doc.text(insp.objectName || '-', 50, y);
      doc.text(insp.equipmentName || '-', 90, y);
      doc.text(insp.type || '-', 140, y);
      doc.text(result, 180, y);
      doc.text(insp.executorName || '-', 210, y);
      
      y += 6;
    });
    
    // Подвал
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Журнал ведётся в электронном виде в соответствии с п. 17.1 ППР № 1479', 145, 200, { align: 'center' });
    
    const filename = `Zhurnal_${period || new Date().toLocaleDateString('ru-RU')}.pdf`;
    doc.save(filename);
    
    return doc;
  }
}

// Экспорт
window.PdfGeneratorService = PdfGeneratorService;
