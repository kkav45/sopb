// js/app.js

class App {
  constructor() {
    // Инициализация сервисов
    this.yandexDisk = new YandexDiskService(YANDEX_CONFIG);
    this.localCache = new LocalCacheService();
    this.syncManager = new SyncManagerService(this.yandexDisk, this.localCache);
    this.pdfGenerator = new PdfGeneratorService();
    
    // Данные приложения
    this.objects = [];
    this.equipment = [];
    this.inspections = [];
    this.violations = [];
    
    // Текущая проверка
    this.currentInspection = null;
    this.currentChecklist = null;
    
    // Текущая страница
    this.currentPage = 'dashboard';
    
    // Настройка sync manager
    this.syncManager.setOnStatusChange((status, result) => {
      this.handleSyncStatus(status, result);
    });
  }

  async init() {
    try {
      // Инициализация IndexedDB
      await this.localCache.init();
      
      // Проверяем OAuth callback (после возврата от Яндекса)
      await this.checkOAuthCallback();
      
      // Загрузка данных
      await this.loadData();
      
      // Обновление дашборда
      this.updateDashboard();
      
      // Настройка навигации
      this.setupNavigation();
      
      // Настройка модальных окон
      this.setupModals();
      
      // Настройка синхронизации
      this.setupSync();
      
      // Настройка обработчиков форм
      this.setupFormHandlers();
      
      console.log('АСОПБ прототип инициализирован');
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      showToast('Ошибка загрузки приложения: ' + error.message, 'error');
    }
  }

  async checkOAuthCallback() {
    // Проверяем, не вернулись ли мы с авторизации Яндекса
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      console.log('[OAuth] Обработка токена...');
      try {
        const token = await this.yandexDisk.handleCallback();
        if (token) {
          console.log('[OAuth] Токен получен и сохранён');
          showToast('Яндекс.Диск подключён!', 'success');
          // Очищаем URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (error) {
        console.error('[OAuth] Ошибка обработки токена:', error);
        showToast('Ошибка подключения Яндекс.Диска', 'error');
      }
    }
  }

  async loadData() {
    try {
      const [objects, equipment, inspections] = await Promise.all([
        this.localCache.getAll('objects'),
        this.localCache.getAll('equipment'),
        this.localCache.getAll('inspections')
      ]);
      
      this.objects = objects.map(e => e.data);
      this.equipment = equipment.map(e => e.data);
      this.inspections = inspections.map(e => e.data);
      
      // Обновляем счётчики
      this.updateStats();
      
      // Рендерим графики
      this.renderDashboardCharts();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  updateDashboard() {
    this.updateStats();
    this.renderEvents();
    this.renderDashboardCharts();
  }

  updateStats() {
    document.getElementById('statObjects').textContent = this.objects.length;
    document.getElementById('statEquipment').textContent = this.equipment.length;
    document.getElementById('statInspections').textContent = this.inspections.length;
    document.getElementById('statViolations').textContent = this.violations.length;
  }

  async renderDashboardCharts() {
    if (!window.chartService) return;

    // Уничтожаем старые графики перед созданием новых
    window.chartService.destroyAll();

    // Статистика по оборудованию
    const equipmentStats = {
      equipmentActive: this.equipment.filter(e => e.status === 'active').length,
      equipmentMaintenance: this.equipment.filter(e => e.status === 'maintenance').length,
      equipmentFaulty: this.equipment.filter(e => e.status === 'faulty').length
    };

    // Статистика по проверкам
    const inspectionsStats = {
      inspectionsMonthly: this.inspections.filter(i => i.type === 'monthly').length,
      inspectionsQuarterly: this.inspections.filter(i => i.type === 'quarterly').length,
      inspectionsAnnual: this.inspections.filter(i => i.type === 'annual').length,
      inspectionsExtra: this.inspections.filter(i => i.type === 'extra').length
    };

    // Статистика по нарушениям
    const violationsStats = {
      violationsNew: this.violations.filter(v => v.status === 'new').length,
      violationsInProgress: this.violations.filter(v => v.status === 'in_progress').length,
      violationsResolved: this.violations.filter(v => v.status === 'resolved').length,
      violationsOverdue: this.violations.filter(v => v.status === 'overdue').length
    };

    // Объединяем статистику
    const stats = {
      ...equipmentStats,
      ...inspectionsStats,
      ...violationsStats
    };

    // Рендерим графики
    await window.chartService.renderDashboardCharts(stats);

    // Обновляем процент соответствия
    const compliancePercent = window.chartService.calculateCompliance(stats);
    const complianceEl = document.getElementById('compliancePercent');
    if (complianceEl) {
      complianceEl.textContent = `${compliancePercent}%`;
    }
  }

  renderEvents() {
    const container = document.getElementById('eventsList');
    
    // Создаём события из проверок
    const events = this.inspections
      .map(insp => ({
        id: insp.id,
        type: 'inspection',
        title: `Проверка оборудования`,
        description: insp.equipmentName || 'Неизвестное оборудование',
        date: insp.completedAt || insp.createdAt,
        status: insp.status
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    if (events.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Событий пока нет</p></div>';
      return;
    }

    container.innerHTML = events.map(event => `
      <div class="event-item" style="
        padding: 12px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        gap: 12px;
        align-items: flex-start;
      ">
        <span style="font-size: 20px;">
          ${event.type === 'inspection' ? '📋' : '⚠️'}
        </span>
        <div style="flex: 1;">
          <div style="font-weight: 500;">${event.title}</div>
          <div style="font-size: 13px; color: #666;">${event.description}</div>
          <div style="font-size: 12px; color: #999; margin-top: 4px;">
            ${formatRelativeTime(event.date)}
          </div>
        </div>
        <span class="status-badge ${event.status === 'completed' ? 'success' : 'warning'}">
          ${event.status === 'completed' ? '✓' : '⏳'}
        </span>
      </div>
    `).join('');
  }

  setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const page = item.dataset.page;
        this.navigateTo(page);
      });
    });

    // Обработка hash в URL
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        this.navigateTo(hash);
      }
    });

    // Начальная навигация
    const initialHash = window.location.hash.slice(1);
    if (initialHash) {
      this.navigateTo(initialHash);
    }
  }

  navigateTo(page) {
    // Обновляем активный пункт меню
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    // Показываем нужную страницу
    document.querySelectorAll('.page').forEach(p => {
      p.classList.toggle('active', p.id === `page-${page}`);
    });

    // Обновляем заголовок
    const titles = {
      dashboard: 'Дашборд',
      objects: 'Объекты',
      equipment: 'Оборудование',
      inspections: 'Проверки',
      calendar: 'Календарь',
      violations: 'Нарушения',
      documents: 'Документы',
      settings: 'Настройки',
      yandex: 'Яндекс.Диск'
    };
    
    document.getElementById('pageTitle').textContent = titles[page] || page;
    this.currentPage = page;

    // Обновляем hash
    window.location.hash = page;

    // Загружаем данные страницы
    this.loadPageData(page);
  }

  async loadPageData(page) {
    switch (page) {
      case 'objects':
        await this.loadObjectsPage();
        break;
      case 'equipment':
        await this.loadEquipmentPage();
        break;
      case 'inspections':
        await this.loadInspectionsPage();
        break;
      case 'calendar':
        await this.loadCalendarPage();
        break;
      case 'violations':
        await this.loadViolationsPage();
        break;
      case 'documents':
        await this.loadDocumentsPage();
        break;
      case 'yandex':
        await this.loadYandexPage();
        break;
    }
  }

  async loadYandexPage() {
    // Инициализация компонента Яндекс.Диска
    setTimeout(() => {
      const container = document.getElementById('yandexDiskContainer');
      if (container && this.yandexDisk) {
        new YandexDiskConnect('yandexDiskContainer', {
          yandexDisk: this.yandexDisk,
          onSync: () => this.syncManager.sync()
        });
      }
    }, 100);
  }

  async loadCalendarPage() {
    // Календарь рендерится в main.js через ganttService
    if (window.ganttService) {
      window.ganttService.renderCalendar(
        'calendarContainer',
        this.inspections,
        this.equipment
      );
    }
  }

  setupModals() {
    // Закрытие модальных окон
    document.querySelectorAll('[data-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.modal;
        document.getElementById(modalId).classList.remove('active');
      });
    });

    // Закрытие по overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        overlay.closest('.modal').classList.remove('active');
      });
    });
  }

  setupFormHandlers() {
    // Обработчик для оборудования
    const saveEquipmentBtn = document.getElementById('saveEquipmentBtn');
    if (saveEquipmentBtn) {
      saveEquipmentBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const form = document.getElementById('equipmentForm');
        if (form.checkValidity()) {
          const formData = new FormData(form);
          const equipmentData = {
            type: formData.get('type'),
            typeName: formData.options?.namedItem('type')?.selectedOptions[0]?.text || '',
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
          
          if (this.editingEquipmentId) {
            await this.updateEquipment(this.editingEquipmentId, equipmentData);
            this.editingEquipmentId = null;
          } else {
            await this.addEquipment(equipmentData);
          }
          document.getElementById('equipmentModal').classList.remove('active');
        }
      });
    }

    // Обработчик для проверок
    const startInspectionBtn = document.getElementById('startInspectionBtn');
    if (startInspectionBtn) {
      startInspectionBtn.addEventListener('click', () => {
        const equipmentId = document.getElementById('inspectionEquipment').value;
        const checklistId = document.getElementById('inspectionChecklist').value;
        
        if (!equipmentId || !checklistId) {
          showToast('Выберите оборудование и чек-лист', 'warning');
          return;
        }
        
        const checklist = window.CHECKLISTS[checklistId];
        if (checklist) {
          this.showChecklistPassForm(checklist);
        }
      });
    }

    // Обработчик для нарушений
    const saveViolationBtn = document.getElementById('saveViolationBtn');
    if (saveViolationBtn) {
      saveViolationBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const form = document.getElementById('violationForm');
        if (form.checkValidity()) {
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
          
          if (this.editingViolationId) {
            await this.updateViolation(this.editingViolationId, violationData);
            this.editingViolationId = null;
          } else {
            await this.addViolation(violationData);
          }
          document.getElementById('violationModal').classList.remove('active');
        }
      });
    }
  }

  setupSync() {
    // Кнопка синхронизации
    const syncButton = document.getElementById('syncButton');
    if (syncButton) {
      syncButton.addEventListener('click', () => this.manualSync());
    }
  }

  async manualSync() {
    showToast('Начало синхронизации...', 'info');
    const result = await this.syncManager.sync();
    
    if (result.status === 'success') {
      showToast(`Синхронизация завершена: ${result.uploaded} файлов загружено`, 'success');
    } else {
      showToast(`Синхронизация: ${result.errors.length} ошибок`, 'error');
    }
  }

  handleSyncStatus(status, result) {
    const syncStatus = document.getElementById('syncStatus');
    const syncButton = document.getElementById('syncButton');
    
    if (status === 'syncing') {
      syncStatus.innerHTML = '<span class="sync-icon spinning">🔄</span><span>Синхронизация...</span>';
      syncButton.disabled = true;
    } else if (status === 'success') {
      syncStatus.innerHTML = '<span style="color: #28a745;">✓</span><span>Синхронизировано</span>';
      syncButton.disabled = false;
      this.lastSyncTime = new Date();
    } else if (status === 'error') {
      syncStatus.innerHTML = '<span style="color: #dc3545;">⚠</span><span>Ошибка синхронизации</span>';
      syncButton.disabled = false;
    }
  }

  startAutoSync() {
    // Запускаем авто-синхронизацию каждые 30 секунд при подключении
    this.syncManager.startAutoSync(30000);
  }

  handleOAuthCallback() {
    const code = getUrlParam('code');
    const error = getUrlParam('error');
    
    if (error) {
      showToast(`Ошибка авторизации: ${error}`, 'error');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    
    if (code) {
      this.handleAuthCode(code);
    }
  }

  async handleAuthCode(code) {
    try {
      showToast('Получение токена...', 'info');
      await this.yandexDisk.exchangeCodeForToken(code);
      showToast('Яндекс.Диск подключён!', 'success');
      
      // Очищаем URL
      window.history.replaceState({}, '', window.location.pathname);
      
      // Обновляем UI
      this.updateYandexDiskUI();
      
      // Загружаем данные с диска
      await this.syncManager.sync();
    } catch (error) {
      showToast(`Ошибка: ${error.message}`, 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  updateYandexDiskUI() {
    // Обновляем компоненты Яндекс.Диска
    const components = document.querySelectorAll('#yandexDiskContainer, #yandexDiskSettings');
    components.forEach(container => {
      if (container && !container.innerHTML) {
        new YandexDiskConnect(container.id, {
          yandexDisk: this.yandexDisk,
          onSync: () => this.syncManager.sync()
        });
      }
    });
  }

  // ========== СТРАНИЦЫ ==========

  async loadObjectsPage() {
    const grid = document.getElementById('objectsGrid');
    
    if (this.objects.length === 0) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏢</div><p>Объекты не добавлены</p></div>';
      return;
    }
    
    grid.innerHTML = this.objects.map(obj => `
      <div class="object-card">
        <div class="object-card-header">
          <div class="object-card-title">${obj.name}</div>
          <span class="object-card-badge">${obj.classFPO || 'Ф4.3'}</span>
        </div>
        <div class="object-card-body">
          <p>📍 ${obj.address || 'Адрес не указан'}</p>
          <p>📐 Площадь: ${obj.area || '?'} м²</p>
          <p>🏗️ Этажей: ${obj.floors || '?'}</p>
          ${obj.responsible ? `<p>👤 Ответственный: ${obj.responsible}</p>` : ''}
        </div>
        <div class="object-card-footer">
          <button class="btn btn-secondary" onclick="app.editObject('${obj.id}')">✏️ Редактировать</button>
          <button class="btn btn-danger" onclick="app.deleteObject('${obj.id}')">🗑️ Удалить</button>
        </div>
      </div>
    `).join('');
  }

  async loadEquipmentPage() {
    const table = document.getElementById('equipmentTable');
    
    if (this.equipment.length === 0) {
      table.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔧</div><p>Оборудование не добавлено</p></div>';
      return;
    }
    
    table.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Тип</th>
            <th>Модель</th>
            <th>Серийный номер</th>
            <th>Объект</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          ${this.equipment.map(eq => `
            <tr>
              <td>${eq.typeName || eq.type}</td>
              <td>${eq.model || '-'}</td>
              <td>${eq.serialNumber || '-'}</td>
              <td>${this.objects.find(o => o.id === eq.objectId)?.name || '-'}</td>
              <td>
                <span class="status-badge ${eq.status === 'active' ? 'success' : 'warning'}">
                  ${eq.status === 'active' ? '✓ Исправно' : '⚠ Требует ТО'}
                </span>
              </td>
              <td>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;">✏️</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async loadInspectionsPage() {
    const list = document.getElementById('inspectionsList');
    
    if (this.inspections.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>Проверки не проводились</p></div>';
      return;
    }
    
    list.innerHTML = this.inspections.map(insp => `
      <div style="
        padding: 16px;
        background: #fff;
        border-radius: 8px;
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 600;">${insp.type || 'Проверка'}</div>
            <div style="font-size: 13px; color: #666;">${insp.equipmentName || 'Оборудование'}</div>
          </div>
          <div style="text-align: right;">
            <span class="status-badge ${insp.status === 'completed' ? 'success' : 'warning'}">
              ${insp.status === 'completed' ? '✓ Завершено' : '⏳ В работе'}
            </span>
            <div style="font-size: 12px; color: #999; margin-top: 4px;">
              ${formatDate(insp.completedAt || insp.createdAt)}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  async loadViolationsPage() {
    const list = document.getElementById('violationsList');
    
    if (this.violations.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><p>Нарушений не найдено</p></div>';
      return;
    }
    
    list.innerHTML = this.violations.map(viol => `
      <div style="
        padding: 16px;
        background: #fff;
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 4px solid #ffc107;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      ">
        <div style="font-weight: 600; margin-bottom: 8px;">${viol.description}</div>
        <div style="font-size: 13px; color: #666;">${viol.norm || ''}</div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <span class="status-badge warning">⚠️ ${viol.status || 'Новое'}</span>
        </div>
      </div>
    `).join('');
  }

  async loadDocumentsPage() {
    const grid = document.getElementById('documentsGrid');
    grid.innerHTML = `
      <div class="objects-grid">
        <div class="object-card">
          <div style="font-size: 40px; text-align: center; margin-bottom: 12px;">📄</div>
          <div style="text-align: center; font-weight: 600;">Журналы эксплуатации</div>
          <div style="font-size: 13px; color: #666; text-align: center; margin: 8px 0;">
            Электронные журналы ТО
          </div>
        </div>
        <div class="object-card">
          <div style="font-size: 40px; text-align: center; margin-bottom: 12px;">📋</div>
          <div style="text-align: center; font-weight: 600;">Акты проверок</div>
          <div style="font-size: 13px; color: #666; text-align: center; margin: 8px 0;">
            Результаты проверок
          </div>
        </div>
        <div class="object-card">
          <div style="font-size: 40px; text-align: center; margin-bottom: 12px;">📜</div>
          <div style="text-align: center; font-weight: 600;">Протоколы испытаний</div>
          <div style="font-size: 13px; color: #666; text-align: center; margin: 8px 0;">
            Инструментальные замеры
          </div>
        </div>
      </div>
    `;
  }

  // ========== CRUD ОПЕРАЦИИ ==========

  async addObject(objectData) {
    const object = {
      id: generateId(),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: objectData
    };
    
    await this.localCache.set('objects', object);
    this.objects.push(object.data);
    
    // Добавляем в очередь синхронизации
    await this.localCache.addToSyncQueue('create', `objects/obj-${object.id}.json`, object);
    
    this.updateStats();
    this.loadObjectsPage();
    showToast('Объект добавлен', 'success');
  }

  async editObject(id) {
    const obj = this.objects.find(o => o.id === id);
    if (!obj) return;
    
    // Заполняем форму
    document.getElementById('objectName').value = obj.name || '';
    document.getElementById('objectAddress').value = obj.address || '';
    document.getElementById('objectClassFPO').value = obj.classFPO || 'Ф4.3';
    document.getElementById('objectCategory').value = obj.category || 'В1';
    document.getElementById('objectArea').value = obj.area || '';
    document.getElementById('objectFloors').value = obj.floors || '';
    document.getElementById('objectResponsible').value = obj.responsible || '';
    
    // Открываем модалку
    document.getElementById('objectModalTitle').textContent = 'Редактирование объекта';
    document.getElementById('objectModal').classList.add('active');
    
    // Сохраняем ID для обновления
    this.editingObjectId = id;
  }

  async updateObject(id, objectData) {
    const object = await this.localCache.get('objects', id);
    if (!object) return;
    
    object.data = objectData;
    object.updatedAt = new Date().toISOString();
    object.version++;
    
    await this.localCache.set('objects', object);
    
    const index = this.objects.findIndex(o => o.id === id);
    if (index !== -1) {
      this.objects[index] = object.data;
    }
    
    // Добавляем в очередь синхронизации
    await this.localCache.addToSyncQueue('update', `objects/obj-${id}.json`, object);
    
    this.updateStats();
    this.loadObjectsPage();
    showToast('Объект обновлён', 'success');
  }

  async deleteObject(id) {
    if (!confirm('Вы уверены, что хотите удалить объект?')) return;
    
    await this.localCache.delete('objects', id);
    this.objects = this.objects.filter(o => o.id !== id);
    
    // Добавляем в очередь синхронизации
    await this.localCache.addToSyncQueue('delete', `objects/obj-${id}.json`);
    
    this.updateStats();
    this.loadObjectsPage();
    showToast('Объект удалён', 'success');
  }

  // ========== ОБОРУДОВАНИЕ ==========

  async loadEquipmentPage() {
    const table = document.getElementById('equipmentTable');
    const searchInput = document.getElementById('equipmentSearch');
    
    if (this.equipment.length === 0) {
      table.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔧</div><p>Оборудование не добавлено</p></div>';
      return;
    }
    
    this.renderEquipmentTable(this.equipment);
    
    // Поиск
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = this.equipment.filter(eq => 
          (eq.model || '').toLowerCase().includes(query) ||
          (eq.typeName || '').toLowerCase().includes(query) ||
          (eq.serialNumber || '').toLowerCase().includes(query)
        );
        this.renderEquipmentTable(filtered);
      });
    }
  }

  renderEquipmentTable(equipment) {
    const table = document.getElementById('equipmentTable');
    
    table.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Тип</th>
            <th>Модель</th>
            <th>Серийный номер</th>
            <th>Объект</th>
            <th>Статус</th>
            <th>Поверка</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          ${equipment.map(eq => {
            const obj = this.objects.find(o => o.id === eq.objectId);
            const verificationStatus = this.getVerificationStatus(eq.nextVerificationDate);
            
            return `
            <tr>
              <td>${eq.typeName || this.getTypeName(eq.type)}</td>
              <td>${eq.model || '-'}</td>
              <td>${eq.serialNumber || '-'}</td>
              <td>${obj?.name || '-'}</td>
              <td>
                <span class="status-badge ${eq.status === 'active' ? 'success' : eq.status === 'faulty' ? 'danger' : 'warning'}">
                  ${eq.status === 'active' ? '✓ Исправно' : eq.status === 'faulty' ? '✕ Неисправно' : '⚠ Требует ТО'}
                </span>
              </td>
              <td>
                <span class="status-badge ${verificationStatus.class}">
                  ${verificationStatus.text}
                </span>
              </td>
              <td>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="app.editEquipment('${eq.id}')">✏️</button>
                <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="app.viewEquipment('${eq.id}')">👁️</button>
              </td>
            </tr>
          `}).join('')}
        </tbody>
      </table>
    `;
  }

  getVerificationStatus(dateStr) {
    if (!dateStr) return { text: '—', class: 'warning' };
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Просрочена (${Math.abs(diffDays)} дн)`, class: 'danger' };
    } else if (diffDays < 30) {
      return { text: `${diffDays} дн`, class: 'warning' };
    } else {
      return { text: 'OK', class: 'success' };
    }
  }

  getTypeName(typeCode) {
    const types = {
      '02-01-001': 'Извещатель дымовой',
      '02-01-004': 'Извещатель тепловой',
      '02-01-006': 'Извещатель пламени',
      '02-01-009': 'Извещатель ручной',
      '02-01-010': 'ППК',
      '02-02-001': 'Громкоговоритель',
      '02-02-004': 'Табло «Выход»',
      '02-03-001': 'Клапан дымовой',
      '02-03-003': 'Вентилятор',
      '02-04-001': 'Ороситель',
      '02-04-005': 'Насос пожарный',
      '02-05-001': 'Огнетушитель ОП',
      '02-05-003': 'Огнетушитель ОУ',
      '02-05-008': 'Шкаф пожарный',
      '02-06-001': 'Дверь противопожарная',
      '02-09-001': 'Лестница пожарная'
    };
    return types[typeCode] || typeCode;
  }

  async addEquipment(equipmentData) {
    const equipment = {
      id: generateId(),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: equipmentData
    };
    
    await this.localCache.set('equipment', equipment);
    this.equipment.push(equipment.data);
    
    await this.localCache.addToSyncQueue('create', `equipment/eq-${equipment.id}.json`, equipment);
    
    this.loadEquipmentPage();
    showToast('Оборудование добавлено', 'success');
  }

  async updateEquipment(id, equipmentData) {
    const equipment = await this.localCache.get('equipment', id);
    if (!equipment) return;
    
    equipment.data = equipmentData;
    equipment.updatedAt = new Date().toISOString();
    equipment.version++;
    
    await this.localCache.set('equipment', equipment);
    
    const index = this.equipment.findIndex(e => e.id === id);
    if (index !== -1) {
      this.equipment[index] = equipment.data;
    }
    
    await this.localCache.addToSyncQueue('update', `equipment/eq-${id}.json`, equipment);
    
    this.loadEquipmentPage();
    showToast('Оборудование обновлено', 'success');
  }

  async editEquipment(id) {
    const eq = this.equipment.find(e => e.id === id);
    if (!eq) return;
    
    // Заполняем форму
    document.getElementById('equipmentType').value = eq.type || '';
    document.getElementById('equipmentModel').value = eq.model || '';
    document.getElementById('equipmentSerial').value = eq.serialNumber || '';
    document.getElementById('equipmentObject').value = eq.objectId || '';
    document.getElementById('equipmentLocation').value = eq.location || '';
    document.getElementById('equipmentInstallDate').value = eq.installDate || '';
    document.getElementById('equipmentExpiration').value = eq.expirationDate || '';
    document.getElementById('equipmentVerification').value = eq.verificationDate || '';
    document.getElementById('equipmentNextVerification').value = eq.nextVerificationDate || '';
    document.getElementById('equipmentStatus').value = eq.status || 'active';
    
    // Заполняем список объектов
    this.populateObjectSelect('equipmentObject');
    
    document.getElementById('equipmentModalTitle').textContent = 'Редактирование оборудования';
    document.getElementById('equipmentModal').classList.add('active');
    
    this.editingEquipmentId = id;
  }

  async viewEquipment(id) {
    const eq = this.equipment.find(e => e.id === id);
    if (!eq) return;
    
    const obj = this.objects.find(o => o.id === eq.objectId);
    
    alert(`Оборудование: ${eq.model}\nТип: ${this.getTypeName(eq.type)}\nОбъект: ${obj?.name || '-'}\nСтатус: ${eq.status}`);
  }

  // ========== ПРОВЕРКИ ==========

  async loadInspectionsPage() {
    const list = document.getElementById('inspectionsList');
    const filter = document.getElementById('inspectionsFilter');
    
    if (this.inspections.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>Проверки не проводились</p></div>';
      return;
    }
    
    this.renderInspectionsList(this.inspections);
    
    // Фильтр
    if (filter) {
      filter.addEventListener('change', (e) => {
        const type = e.target.value;
        const filtered = type ? this.inspections.filter(i => i.type === type) : this.inspections;
        this.renderInspectionsList(filtered);
      });
    }
  }

  renderInspectionsList(inspections) {
    const list = document.getElementById('inspectionsList');
    
    list.innerHTML = inspections.map(insp => {
      const eq = this.equipment.find(e => e.id === insp.equipmentId);
      const obj = this.objects.find(o => o.id === eq?.objectId);
      
      return `
      <div style="
        padding: 16px;
        background: #fff;
        border-radius: 8px;
        margin-bottom: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        border-left: 4px solid ${insp.results?.overallStatus === 'pass' ? '#28a745' : '#ffc107'};
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <div style="font-weight: 600;">${this.getTypeName(insp.type)} проверка</div>
            <div style="font-size: 13px; color: #666;">${eq?.model || 'Оборудование'} • ${obj?.name || 'Объект'}</div>
            <div style="font-size: 12px; color: #999; margin-top: 4px;">
              ${formatDate(insp.completedAt || insp.createdAt)}
            </div>
          </div>
          <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <span class="status-badge ${insp.results?.overallStatus === 'pass' ? 'success' : 'warning'}">
              ${insp.results?.overallStatus === 'pass' ? '✓ Исправно' : '⚠ Требует внимания'}
            </span>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="app.viewAct('${insp.id}')">📄 Акт</button>
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="app.editInspection('${insp.id}')">✏️</button>
            </div>
          </div>
        </div>
      </div>
    `}).join('');
  }

  async startNewInspection() {
    // Заполняем списки
    this.populateEquipmentSelect('inspectionEquipment');
    this.populateChecklistSelect('inspectionChecklist');
    
    document.getElementById('inspectionModal').classList.add('active');
  }

  populateEquipmentSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Выберите оборудование</option>' + 
      this.equipment.map(eq => {
        const obj = this.objects.find(o => o.id === eq.objectId);
        return `<option value="${eq.id}">${eq.model || eq.type} ${obj ? '(' + obj.name + ')' : ''}</option>`;
      }).join('');
  }

  populateChecklistSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Выберите чек-лист</option>' + 
      Object.values(CHECKLISTS).map(cl => 
        `<option value="${cl.id}" data-type="${cl.type}">${cl.name}</option>`
      ).join('');
    
    // Обработчик выбора чек-листа
    select.addEventListener('change', (e) => {
      const checklistId = e.target.value;
      if (checklistId && CHECKLISTS[checklistId]) {
        this.showChecklistPreview(CHECKLISTS[checklistId]);
      }
    });
  }

  showChecklistPreview(checklist) {
    const container = document.getElementById('checklistContainer');
    const itemsContainer = document.getElementById('checklistItems');
    
    if (!checklist) {
      container.style.display = 'none';
      return;
    }
    
    container.style.display = 'block';
    itemsContainer.innerHTML = checklist.items.map(item => `
      <div class="checklist-item">
        <div class="checklist-header">
          <span class="checklist-title">${item.title}</span>
        </div>
        <div class="checklist-method">Метод: ${item.method}</div>
        <div class="checklist-criteria">Критерий: ${item.criteria}</div>
        <div class="checklist-method">Инструмент: ${item.tool}</div>
      </div>
    `).join('');
  }

  async completeInspection() {
    const form = document.getElementById('inspectionForm');
    const equipmentId = document.getElementById('inspectionEquipment').value;
    const type = document.getElementById('inspectionType').value;
    const checklistId = document.getElementById('inspectionChecklist').value;
    
    if (!equipmentId || !type || !checklistId) {
      showToast('Заполните все обязательные поля', 'error');
      return;
    }
    
    const signature = document.getElementById('checklistSignature').checked;
    if (!signature) {
      showToast('Необходимо подписать результаты проверки', 'warning');
      return;
    }
    
    const comment = document.getElementById('checklistComment').value;
    
    // Собираем результаты чек-листа
    const results = {
      items: [],
      overallStatus: 'pass'
    };
    
    const checklistItems = document.querySelectorAll('.checklist-item-result');
    checklistItems.forEach(item => {
      const status = item.dataset.status;
      if (status === 'fail') {
        results.overallStatus = 'fail';
      }
      results.items.push({
        id: item.dataset.id,
        title: item.dataset.title,
        status,
        comment: item.querySelector('.checklist-comment')?.value || ''
      });
    });
    
    const equipment = this.equipment.find(e => e.id === equipmentId);
    const obj = this.objects.find(o => o.id === equipment?.objectId);
    
    const inspection = {
      id: generateId(),
      version: 1,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      data: {
        equipmentId,
        equipmentName: equipment?.model || '',
        objectId: equipment?.objectId,
        objectName: obj?.name || '',
        type,
        checklistId,
        results,
        comment,
        status: 'completed',
        executorName: 'Пользователь'
      }
    };
    
    await this.localCache.set('inspections', inspection);
    this.inspections.push(inspection.data);
    
    await this.localCache.addToSyncQueue('create', `inspections/${inspection.id}.json`, inspection);
    
    // Закрываем модалку
    document.getElementById('checklistPassModal').classList.remove('active');
    document.getElementById('inspectionModal').classList.remove('active');
    
    this.loadInspectionsPage();
    this.updateStats();
    showToast('Проверка завершена', 'success');
    
    // Предлагаем скачать акт
    if (confirm('Скачать акт проверки?')) {
      this.viewAct(inspection.id);
    }
  }

  async viewAct(inspectionId) {
    const inspection = this.inspections.find(i => i.id === inspectionId);
    if (!inspection) return;
    
    const equipment = this.equipment.find(e => e.id === inspection.equipmentId);
    const obj = this.objects.find(o => o.id === inspection.objectId);
    const checklist = CHECKLISTS[inspection.checklistId];
    
    // Генерируем акт
    await this.pdfGenerator.generateInspectionAct(inspection, equipment, obj, checklist);
    
    document.getElementById('actViewModal').classList.add('active');
  }

  // ========== НАРУШЕНИЯ ==========

  async loadViolationsPage() {
    const list = document.getElementById('violationsList');
    
    if (this.violations.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✓</div><p>Нарушений не найдено</p></div>';
      return;
    }
    
    list.innerHTML = this.violations.map(viol => {
      const obj = this.objects.find(o => o.id === viol.objectId);
      const koap = KOAP_VIOLATIONS[viol.koapArticle];
      
      return `
      <div style="
        padding: 16px;
        background: #fff;
        border-radius: 8px;
        margin-bottom: 12px;
        border-left: 4px solid ${this.getViolationColor(viol.status)};
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      ">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1;">
            <div style="font-weight: 600; margin-bottom: 8px;">${viol.description}</div>
            <div style="font-size: 13px; color: #666;">
              ${obj ? '📍 ' + obj.name : ''}
              ${viol.norm ? ' • ' + viol.norm : ''}
            </div>
            ${koap ? `<div style="font-size: 12px; color: #999; margin-top: 4px;">⚖️ ${koap.title} (штраф до ${koap.sanctions.legal})</div>` : ''}
            <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center;">
              <span class="status-badge ${this.getViolationStatusClass(viol.status)}">
                ${this.getViolationStatusLabel(viol.status)}
              </span>
              ${viol.deadline ? `<span style="font-size: 12px; color: #999;">Срок: ${formatDate(viol.deadline, { month: '2-digit', day: '2-digit', year: 'numeric' })}</span>` : ''}
            </div>
          </div>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="app.editViolation('${viol.id}')">✏️</button>
            <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;" onclick="app.deleteViolation('${viol.id}')">🗑️</button>
          </div>
        </div>
      </div>
    `}).join('');
  }

  getViolationColor(status) {
    const colors = {
      new: '#17a2b8',
      in_progress: '#ffc107',
      resolved: '#28a745',
      overdue: '#dc3545'
    };
    return colors[status] || '#6c757d';
  }

  getViolationStatusClass(status) {
    const classes = {
      new: 'warning',
      in_progress: 'warning',
      resolved: 'success',
      overdue: 'danger'
    };
    return classes[status] || 'warning';
  }

  getViolationStatusLabel(status) {
    const labels = {
      new: 'Новое',
      in_progress: 'В работе',
      resolved: 'Устранено',
      overdue: 'Просрочено'
    };
    return labels[status] || status;
  }

  async addViolation(violationData) {
    const violation = {
      id: generateId(),
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      data: violationData
    };
    
    await this.localCache.set('violations', violation);
    this.violations.push(violation.data);
    
    await this.localCache.addToSyncQueue('create', `violations/viol-${violation.id}.json`, violation);
    
    this.loadViolationsPage();
    this.updateStats();
    showToast('Нарушение добавлено', 'success');
  }

  async updateViolation(id, violationData) {
    const violation = await this.localCache.get('violations', id);
    if (!violation) return;
    
    violation.data = violationData;
    violation.updatedAt = new Date().toISOString();
    violation.version++;
    
    await this.localCache.set('violations', violation);
    
    const index = this.violations.findIndex(v => v.id === id);
    if (index !== -1) {
      this.violations[index] = violation.data;
    }
    
    await this.localCache.addToSyncQueue('update', `violations/viol-${id}.json`, violation);
    
    this.loadViolationsPage();
    showToast('Нарушение обновлено', 'success');
  }

  async editViolation(id) {
    const viol = this.violations.find(v => v.id === id);
    if (!viol) return;
    
    // Заполняем форму
    this.populateObjectSelect('violationObject');
    this.populateEquipmentSelect('violationEquipment');
    
    document.getElementById('violationObject').value = viol.objectId || '';
    document.getElementById('violationEquipment').value = viol.equipmentId || '';
    document.getElementById('violationDescription').value = viol.description || '';
    document.getElementById('violationNorm').value = viol.norm || '';
    document.getElementById('violationKoap').value = viol.koapArticle || '';
    document.getElementById('violationDeadline').value = viol.deadline || '';
    document.getElementById('violationStatus').value = viol.status || 'new';
    
    document.getElementById('violationModalTitle').textContent = 'Редактирование нарушения';
    document.getElementById('violationModal').classList.add('active');
    
    this.editingViolationId = id;
  }

  async deleteViolation(id) {
    if (!confirm('Вы уверены, что хотите удалить нарушение?')) return;
    
    await this.localCache.delete('violations', id);
    this.violations = this.violations.filter(v => v.id !== id);
    
    await this.localCache.addToSyncQueue('delete', `violations/viol-${id}.json`);
    
    this.loadViolationsPage();
    this.updateStats();
    showToast('Нарушение удалено', 'success');
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

  populateObjectSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Выберите объект</option>' + 
      this.objects.map(obj => `<option value="${obj.id}">${obj.name}</option>`).join('');
  }

  // Показ формы прохождения чек-листа
  showChecklistPassForm(checklist) {
    const container = document.getElementById('checklistPassContent');
    if (!container) return;
    
    this.currentChecklist = checklist;
    
    container.innerHTML = `
      <div style="margin-bottom: 16px; padding: 12px; background: #e3f2fd; border-radius: 8px;">
        <strong>Чек-лист:</strong> ${checklist.name}
      </div>
      
      ${checklist.items.map(item => `
        <div class="checklist-item checklist-item-result" data-id="${item.id}" data-title="${item.title}" data-status="none">
          <div class="checklist-header">
            <span class="checklist-title">${item.title}</span>
            <div class="checklist-status">
              <button type="button" class="checklist-btn" onclick="window.app.setChecklistItemStatus(this, 'pass')">✓ Исправно</button>
              <button type="button" class="checklist-btn fail" onclick="window.app.setChecklistItemStatus(this, 'fail')">✕ Неисправно</button>
            </div>
          </div>
          <div class="checklist-method"><strong>Метод:</strong> ${item.method}</div>
          <div class="checklist-method"><strong>Инструмент:</strong> ${item.tool}</div>
          <div class="checklist-criteria"><strong>Критерий:</strong> ${item.criteria}</div>
          <textarea class="checklist-comment" placeholder="Комментарий (если есть замечания)"></textarea>
        </div>
      `).join('')}
    `;
    
    // Закрываем первое модальное окно и открываем второе
    document.getElementById('inspectionModal').classList.remove('active');
    document.getElementById('checklistPassModal').classList.add('active');
  }

  // Установка статуса для пункта чек-листа
  setChecklistItemStatus(button, status) {
    const item = button.closest('.checklist-item-result');
    if (!item) return;
    
    // Снимаем активность со всех кнопок
    item.querySelectorAll('.checklist-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Активируем нажатую кнопку
    button.classList.add('active');
    
    // Устанавливаем статус
    item.dataset.status = status;
    
    // Добавляем класс стиля
    item.classList.remove('pass', 'fail');
    if (status !== 'none') {
      item.classList.add(status);
    }
  }
}

// Глобальный экземпляр приложения
let app;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
  app.init();
});
