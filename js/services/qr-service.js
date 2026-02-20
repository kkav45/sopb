// js/services/qr-service.js

class QRService {
  constructor() {
    this.qrcode = null;
    this.html5QrcodeScanner = null;
    this.loaded = false;
  }

  // Загрузка библиотек
  async load() {
    if (this.loaded) return;

    return Promise.all([
      this.loadQRCodeLib(),
      this.loadHtml5QrcodeLib()
    ]);
  }

  async loadQRCodeLib() {
    return new Promise((resolve, reject) => {
      if (window.QRCode) {
        this.qrcode = window.QRCode;
        this.loaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      script.onload = () => {
        this.qrcode = window.QRCode;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async loadHtml5QrcodeLib() {
    return new Promise((resolve, reject) => {
      if (window.Html5QrcodeScanner) {
        this.html5QrcodeScanner = window.Html5QrcodeScanner;
        this.loaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode/minified/html5-qrcode.min.js';
      script.onload = () => {
        this.html5QrcodeScanner = window.Html5QrcodeScanner;
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Генерация QR-кода
  async generateQRCode(containerId, data, options = {}) {
    await this.load();

    const container = document.getElementById(containerId);
    if (!container) return;

    // Очищаем контейнер
    container.innerHTML = '';

    const defaultOptions = {
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    };

    const qrOptions = { ...defaultOptions, ...options };

    this.qrcode = new QRCode(container, {
      text: data,
      width: qrOptions.width,
      height: qrOptions.height,
      colorDark: qrOptions.colorDark,
      colorLight: qrOptions.colorLight,
      correctLevel: qrOptions.correctLevel
    });

    return this.qrcode;
  }

  // Генерация QR-кода для оборудования
  async generateEquipmentQR(equipment, containerId) {
    const qrData = {
      type: 'equipment',
      id: equipment.id,
      model: equipment.model,
      serialNumber: equipment.serialNumber,
      typeCode: equipment.type,
      location: equipment.location
    };

    const qrString = JSON.stringify(qrData);
    await this.generateQRCode(containerId, qrString, {
      width: 180,
      height: 180
    });

    // Добавляем подпись
    const container = document.getElementById(containerId);
    if (container) {
      const label = document.createElement('div');
      label.className = 'qr-label';
      label.innerHTML = `
        <strong>${equipment.model || 'Оборудование'}</strong><br>
        <small>${equipment.serialNumber || ''}</small>
      `;
      label.style.cssText = `
        text-align: center;
        margin-top: 8px;
        font-size: 12px;
        color: #333;
      `;
      container.appendChild(label);
    }
  }

  // Сканирование QR-кода
  async startScanner(containerId, onScan) {
    await this.load();

    const defaultConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    this.html5QrcodeScanner = new window.Html5QrcodeScanner(
      containerId,
      defaultConfig,
      /* verbose= */ false
    );

    this.html5QrcodeScanner.render((decodedText, decodedResult) => {
      // Успешное сканирование
      console.log('QR код распознан:', decodedText);
      
      try {
        const data = JSON.parse(decodedText);
        onScan(data, decodedResult);
      } catch {
        onScan({ raw: decodedText }, decodedResult);
      }

      // Останавливаем сканер после успешного сканирования
      this.stopScanner();
    }, (error) => {
      // Ошибка сканирования (игнорируем, т.к. это нормально при отсутствии QR в кадре)
      console.warn('Ошибка сканирования:', error);
    });

    return this.html5QrcodeScanner;
  }

  stopScanner() {
    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear().catch(error => {
        console.error('Ошибка остановки сканера:', error);
      });
      this.html5QrcodeScanner = null;
    }
  }

  // Печать QR-кода
  async printQRCode(equipment) {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR-код: ${equipment.model || 'Оборудование'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 20px;
          }
          .qr-container {
            display: inline-block;
            padding: 20px;
            border: 2px solid #333;
            border-radius: 8px;
          }
          .qr-label {
            margin-top: 15px;
            font-size: 14px;
          }
          .qr-label strong {
            display: block;
            margin-bottom: 5px;
            font-size: 16px;
          }
          .qr-label small {
            color: #666;
          }
          @media print {
            body { padding: 10px; }
            .qr-container { border: 1px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <div id="qrcode"></div>
          <div class="qr-label">
            <strong>${equipment.model || 'Оборудование'}</strong>
            <small>Серийный номер: ${equipment.serialNumber || 'N/A'}</small><br>
            <small>Тип: ${equipment.type || 'N/A'}</small><br>
            <small>Место: ${equipment.location || 'N/A'}</small>
          </div>
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
        <script>
          new QRCode(document.getElementById("qrcode"), {
            text: ${JSON.stringify(JSON.stringify({
              type: 'equipment',
              id: equipment.id,
              model: equipment.model,
              serialNumber: equipment.serialNumber
            }))},
            width: 200,
            height: 200
          });
        <\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  // Обработка отсканированного QR-кода
  async handleScannedQR(data) {
    if (!data || !data.type) {
      showToast('Неверный формат QR-кода', 'error');
      return null;
    }

    switch (data.type) {
      case 'equipment':
        return this.handleEquipmentQR(data);
      case 'object':
        return this.handleObjectQR(data);
      default:
        showToast('Неизвестный тип QR-кода', 'warning');
        return null;
    }
  }

  async handleEquipmentQR(data) {
    if (!window.app) return null;

    const equipment = window.app.equipment.find(e => e.id === data.id);
    
    if (!equipment) {
      showToast('Оборудование не найдено', 'error');
      return null;
    }

    // Показываем карточку оборудования
    this.showEquipmentCard(equipment);
    return equipment;
  }

  async handleObjectQR(data) {
    if (!window.app) return null;

    const object = window.app.objects.find(o => o.id === data.id);
    
    if (!object) {
      showToast('Объект не найден', 'error');
      return null;
    }

    // Показываем карточку объекта
    this.showObjectCard(object);
    return object;
  }

  showEquipmentCard(equipment) {
    const obj = window.app.objects.find(o => o.id === equipment.objectId);
    
    const info = `
      <div style="padding: 20px;">
        <h3 style="margin-bottom: 15px;">🔧 ${equipment.model || 'Оборудование'}</h3>
        
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="padding: 5px 0; color: #666;">Тип:</td><td>${window.app.getTypeName(equipment.type)}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Серийный номер:</td><td>${equipment.serialNumber || '-'}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Объект:</td><td>${obj?.name || '-'}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Место установки:</td><td>${equipment.location || '-'}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Статус:</td><td>
            <span class="status-badge ${equipment.status === 'active' ? 'success' : 'warning'}">
              ${equipment.status === 'active' ? '✓ Исправно' : '⚠ Требует ТО'}
            </span>
          </td></tr>
          ${equipment.nextVerificationDate ? `
          <tr><td style="padding: 5px 0; color: #666;">Поверка:</td><td>${new Date(equipment.nextVerificationDate).toLocaleDateString('ru-RU')}</td></tr>
          ` : ''}
        </table>
        
        <div style="margin-top: 20px; display: flex; gap: 10px;">
          <button class="btn btn-primary" onclick="window.app.editEquipment('${equipment.id}')">✏️ Редактировать</button>
          <button class="btn btn-secondary" onclick="window.startInspectionFromQR('${equipment.id}')">📋 Проверка</button>
        </div>
      </div>
    `;

    this.showModal('Информация об оборудовании', info);
  }

  showObjectCard(object) {
    const info = `
      <div style="padding: 20px;">
        <h3 style="margin-bottom: 15px;">🏢 ${object.name}</h3>
        
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="padding: 5px 0; color: #666;">Адрес:</td><td>${object.address || '-'}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Класс ФПО:</td><td>${object.classFPO || '-'}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Категория:</td><td>${object.category || '-'}</td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Площадь:</td><td>${object.area || '-'} м²</td></tr>
          <tr><td style="padding: 5px 0; color: #666;">Этажность:</td><td>${object.floors || '-'}</td></tr>
          ${object.responsible ? `
          <tr><td style="padding: 5px 0; color: #666;">Ответственный:</td><td>${object.responsible}</td></tr>
          ` : ''}
        </table>
      </div>
    `;

    this.showModal('Информация об объекте', info);
  }

  showModal(title, content) {
    const modal = document.createElement('div');
    modal.id = 'qrInfoModal';
    modal.className = 'modal active';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.closest('.modal').remove();"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" onclick="this.closest('.modal').remove();">&times;</button>
        </div>
        <div class="modal-body">${content}</div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

// Глобальный сервис
window.qrService = new QRService();

// Функция для начала проверки из QR-кода
window.startInspectionFromQR = (equipmentId) => {
  if (window.app) {
    document.getElementById('qrInfoModal')?.remove();
    window.app.startNewInspection();
    
    // Выбираем оборудование
    setTimeout(() => {
      const select = document.getElementById('inspectionEquipment');
      if (select) {
        select.value = equipmentId;
        select.dispatchEvent(new Event('change'));
      }
    }, 100);
  }
};
