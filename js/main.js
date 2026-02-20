// js/main.js

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  console.log('АСОПБ v0.4 - Прототип системы пожарной безопасности');
  console.log('Загрузка модулей...');
  
  // Создаём глобальное приложение
  window.app = new App();
  app.init().catch(error => {
    console.error('Ошибка инициализации приложения:', error);
    showToast('Ошибка загрузки приложения', 'error');
  });
  
  // Обработчик кнопки добавления объекта
  const addObjectBtn = document.getElementById('addObjectBtn');
  if (addObjectBtn) {
    addObjectBtn.addEventListener('click', () => {
      document.getElementById('objectModalTitle').textContent = 'Новый объект';
      document.getElementById('objectForm').reset();
      document.getElementById('objectModal').classList.add('active');
      window.app.editingObjectId = null;
    });
  }
  
  // Обработчик кнопки добавления оборудования
  const addEquipmentBtn = document.getElementById('addEquipmentBtn');
  if (addEquipmentBtn) {
    addEquipmentBtn.addEventListener('click', () => {
      document.getElementById('equipmentModalTitle').textContent = 'Новое оборудование';
      document.getElementById('equipmentForm').reset();
      window.app.populateObjectSelect('equipmentObject');
      document.getElementById('equipmentModal').classList.add('active');
      window.app.editingEquipmentId = null;
    });
  }
  
  // Обработчик кнопки новой проверки
  const addInspectionBtn = document.getElementById('addInspectionBtn');
  if (addInspectionBtn) {
    addInspectionBtn.addEventListener('click', () => {
      window.app.startNewInspection();
    });
  }
  
  // Обработчик кнопки добавления нарушения
  const addViolationBtn = document.getElementById('addViolationBtn');
  if (addViolationBtn) {
    addViolationBtn.addEventListener('click', () => {
      document.getElementById('violationModalTitle').textContent = 'Новое нарушение';
      document.getElementById('violationForm').reset();
      window.app.populateObjectSelect('violationObject');
      window.app.populateEquipmentSelect('violationEquipment');
      document.getElementById('violationModal').classList.add('active');
      window.app.editingViolationId = null;
    });
  }
  
  // Обработчик сохранения объекта
  const saveObjectBtn = document.getElementById('saveObjectBtn');
  if (saveObjectBtn) {
    saveObjectBtn.addEventListener('click', async () => {
      const form = document.getElementById('objectForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const objectData = {
        name: formData.get('name'),
        address: formData.get('address'),
        classFPO: formData.get('classFPO'),
        category: formData.get('category'),
        area: formData.get('area') ? Number(formData.get('area')) : null,
        floors: formData.get('floors') ? Number(formData.get('floors')) : null,
        responsible: formData.get('responsible')
      };
      
      if (window.app.editingObjectId) {
        await window.app.updateObject(window.app.editingObjectId, objectData);
      } else {
        await window.app.addObject(objectData);
      }
      
      document.getElementById('objectModal').classList.remove('active');
    });
  }
  
  // Обработчик сохранения оборудования
  const saveEquipmentBtn = document.getElementById('saveEquipmentBtn');
  if (saveEquipmentBtn) {
    saveEquipmentBtn.addEventListener('click', async () => {
      const form = document.getElementById('equipmentForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const equipmentData = {
        type: formData.get('type'),
        typeName: formData.options.namedItem('type')?.selectedOptions[0]?.text || '',
        model: formData.get('model'),
        serialNumber: formData.get('serialNumber'),
        objectId: formData.get('objectId'),
        location: formData.get('location'),
        installDate: formData.get('installDate'),
        expirationDate: formData.get('expirationDate'),
        verificationDate: formData.get('verificationDate'),
        nextVerificationDate: formData.get('nextVerificationDate'),
        status: formData.get('status')
      };
      
      if (window.app.editingEquipmentId) {
        await window.app.updateEquipment(window.app.editingEquipmentId, equipmentData);
      } else {
        await window.app.addEquipment(equipmentData);
      }
      
      document.getElementById('equipmentModal').classList.remove('active');
    });
  }
  
  // Обработчик начала проверки
  const startInspectionBtn = document.getElementById('startInspectionBtn');
  if (startInspectionBtn) {
    startInspectionBtn.addEventListener('click', () => {
      const equipmentId = document.getElementById('inspectionEquipment').value;
      const checklistId = document.getElementById('inspectionChecklist').value;
      
      if (!equipmentId || !checklistId) {
        showToast('Выберите оборудование и чек-лист', 'warning');
        return;
      }
      
      const checklist = CHECKLISTS[checklistId];
      if (!checklist) return;
      
      // Показываем чек-лист для прохождения
      window.app.showChecklistPassForm(checklist);
    });
  }
  
  // Обработчик завершения проверки
  const completeInspectionBtn = document.getElementById('completeInspectionBtn');
  if (completeInspectionBtn) {
    completeInspectionBtn.addEventListener('click', () => {
      window.app.completeInspection();
    });
  }
  
  // Обработчик сохранения нарушения
  const saveViolationBtn = document.getElementById('saveViolationBtn');
  if (saveViolationBtn) {
    saveViolationBtn.addEventListener('click', async () => {
      const form = document.getElementById('violationForm');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      
      const formData = new FormData(form);
      const violationData = {
        objectId: formData.get('objectId'),
        equipmentId: formData.get('equipmentId'),
        description: formData.get('description'),
        norm: formData.get('norm'),
        koapArticle: formData.get('koapArticle'),
        deadline: formData.get('deadline'),
        status: formData.get('status')
      };
      
      if (window.app.editingViolationId) {
        await window.app.updateViolation(window.app.editingViolationId, violationData);
      } else {
        await window.app.addViolation(violationData);
      }
      
      document.getElementById('violationModal').classList.remove('active');
    });
  }
  
  // Обработчик кнопки сканирования QR
  const qrScanButton = document.getElementById('qrScanButton');
  if (qrScanButton) {
    qrScanButton.addEventListener('click', () => {
      openQRScanner();
    });
  }

  // Обработчик кнопки скачивания PDF
  const downloadActPdf = document.getElementById('downloadActPdf');
  if (downloadActPdf) {
    downloadActPdf.addEventListener('click', () => {
      showToast('PDF загружен', 'success');
    });
  }
  
  // ========== QR СКАНЕР ==========
  
  async function openQRScanner() {
    document.getElementById('qrScannerModal').classList.add('active');
    
    try {
      await window.qrService.load();
      
      await window.qrService.startScanner('qr-reader', async (data, result) => {
        console.log('QR распознан:', data);
        
        // Обрабатываем результат
        if (data) {
          await window.qrService.handleScannedQR(data);
        }
        
        // Закрываем сканер
        document.getElementById('qrScannerModal').classList.remove('active');
      });
    } catch (error) {
      console.error('Ошибка сканера:', error);
      showToast('Ошибка сканирования: ' + error.message, 'error');
    }
  }
  
  // ========== ФОТОФИКСАЦИЯ ==========
  
  let photoModalOpen = false;
  
  async function openPhotoModal() {
    if (photoModalOpen) return;
    photoModalOpen = true;
    
    document.getElementById('photoModal').classList.add('active');
    
    // Инициализация камеры
    const initialized = await window.photoService.initCamera('photoVideo');
    
    if (!initialized) {
      showToast('Не удалось инициализировать камеру', 'error');
    }
    
    // Обработчик кнопки "Сделать фото"
    document.getElementById('takePhotoBtn').onclick = () => {
      window.photoService.takePhoto();
    };
    
    // Обработчик кнопки "Сменить камеру"
    document.getElementById('switchCameraBtn').onclick = async () => {
      await window.photoService.switchCamera();
    };
    
    // Обработчик загрузки файлов
    document.getElementById('photoUpload').onchange = async (e) => {
      if (e.target.files.length > 0) {
        await window.photoService.loadFromFiles(e.target.files);
      }
    };
    
    // Обработчик кнопки "Сохранить фото"
    document.getElementById('savePhotosBtn').onclick = () => {
      const photos = window.photoService.getPhotos();
      
      if (photos.length === 0) {
        showToast('Нет фото для сохранения', 'warning');
        return;
      }
      
      // Сохраняем в текущую проверку или нарушению
      if (window.app.currentInspection) {
        window.app.currentInspection.photos = photos;
        showToast(`Сохранено ${photos.length} фото`, 'success');
      }
      
      // Закрываем модалку
      closePhotoModal();
    };
  }
  
  function closePhotoModal() {
    window.photoService.stop();
    window.photoService.clear();
    document.getElementById('photoModal').classList.remove('active');
    photoModalOpen = false;
  }
  
  // Закрытие модалок по overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      if (modal.id === 'photoModal') {
        closePhotoModal();
      } else if (modal.id === 'qrScannerModal') {
        window.qrService.stopScanner();
      }
      modal.classList.remove('active');
    });
  });

  // ========== КАЛЕНДАРЬ (ГАНТ) ==========
  
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  
  if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
      window.ganttService.prevMonth();
      loadCalendarPage();
    });
  }
  
  if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
      window.ganttService.nextMonth();
      loadCalendarPage();
    });
  }
  
  async function loadCalendarPage() {
    if (!window.app) return;
    
    const container = document.getElementById('calendarContainer');
    if (!container) return;
    
    // Рендеринг календаря
    window.ganttService.renderCalendar(
      'calendarContainer',
      window.app.inspections,
      window.app.equipment
    );
  }
  
  // Мобильное меню
  const menuToggle = document.getElementById('menuToggle');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.add('active');
    });
  }
  
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }
  
  // Закрытие sidebar при клике вне его на мобильных
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    }
  });
  
  // Инициализация компонента Яндекс.Диска на дашборде
  setTimeout(() => {
    const container = document.getElementById('yandexDiskContainer');
    if (container && window.app?.yandexDisk) {
      new YandexDiskConnect('yandexDiskContainer', {
        yandexDisk: window.app.yandexDisk,
        onSync: () => window.app.syncManager.sync()
      });
    }
    
    const settingsContainer = document.getElementById('yandexDiskSettings');
    if (settingsContainer && window.app?.yandexDisk) {
      new YandexDiskConnect('yandexDiskSettings', {
        yandexDisk: window.app.yandexDisk,
        onSync: () => window.app.syncManager.sync()
      });
    }
  }, 100);
});

// Глобальные функции для доступа из HTML
window.editObject = (id) => {
  if (window.app) {
    window.app.editObject(id);
  }
};

window.deleteObject = (id) => {
  if (window.app) {
    window.app.deleteObject(id);
  }
};

window.editEquipment = (id) => {
  if (window.app) {
    window.app.editEquipment(id);
  }
};

window.viewEquipment = (id) => {
  if (window.app) {
    window.app.viewEquipment(id);
  }
};

window.viewAct = (id) => {
  if (window.app) {
    window.app.viewAct(id);
  }
};

window.editViolation = (id) => {
  if (window.app) {
    window.app.editViolation(id);
  }
};

window.deleteViolation = (id) => {
  if (window.app) {
    window.app.deleteViolation(id);
  }
};
