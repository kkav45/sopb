// js/components/yandex-disk-connect.js

class YandexDiskConnect {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.yandexDisk = options.yandexDisk;
    this.onConnect = options.onConnect;
    this.onDisconnect = options.onDisconnect;
    this.onSync = options.onSync;
    this.isSyncing = false;
    this.lastSyncTime = null;
    
    // Проверяем callback после загрузки
    this.checkCallback();
    
    this.render();
    this.updateState();
  }

  async checkCallback() {
    // Проверяем, не вернулись ли мы с авторизации
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Обрабатываем токен
      const token = await this.yandexDisk.handleCallback();
      if (token) {
        showToast('Яндекс.Диск подключён!', 'success');
        this.updateState();
        if (this.onConnect) {
          this.onConnect(token);
        }
      }
    }
  }

  async updateState() {
    const isConnected = await this.yandexDisk.isAuthenticated();
    this.render(isConnected);
  }

  formatLastSync(date) {
    if (!date) return 'никогда';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    return date.toLocaleDateString('ru-RU');
  }

  handleConnect() {
    // Открываем авторизацию в том же окне (не popup)
    const authUrl = this.yandexDisk.getAuthUrl();
    window.location.href = authUrl;
  }

  async handleDisconnect() {
    if (confirm('Вы уверены, что хотите отключить Яндекс.Диск? Синхронизация данных прекратится.')) {
      await this.yandexDisk.disconnect();
      this.render(false);
      if (this.onDisconnect) {
        this.onDisconnect();
      }
      showToast('Яндекс.Диск отключён', 'warning');
    }
  }

  handleSync() {
    if (this.onSync && !this.isSyncing) {
      this.isSyncing = true;
      this.render(true);
      this.onSync().then(() => {
        this.isSyncing = false;
        this.lastSyncTime = new Date();
        this.render(true);
      });
    }
  }

  render(isConnected = false) {
    const spinningClass = this.isSyncing ? ' spinning' : '';
    
    this.container.innerHTML = `
      <div class="yandex-disk-connect">
        <div class="yd-header">
          <span class="yd-icon">☁️</span>
          <h4>Яндекс.Диск</h4>
        </div>
        
        ${isConnected ? this.renderConnected() : this.renderDisconnected()}
      </div>
      
      <style>
        .yandex-disk-connect {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
        }
        
        .yd-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }
        
        .yd-icon {
          font-size: 24px;
        }
        
        .yd-header h4 {
          margin: 0;
          font-size: 18px;
          color: #333;
        }
        
        .yd-status {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #e8f5e9;
          color: #2e7d32;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 12px;
        }
        
        .yd-user {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: #fff;
          border-radius: 6px;
          margin-bottom: 12px;
          font-size: 14px;
        }
        
        .yd-sync-info {
          padding: 10px;
          background: #fff;
          border-radius: 6px;
          font-size: 13px;
          color: #666;
          margin-bottom: 12px;
        }
        
        .yd-sync-time {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .yd-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .yd-description {
          margin-bottom: 16px;
          color: #555;
          font-size: 14px;
        }
        
        .yd-description ul {
          list-style: none;
          padding: 0;
          margin: 12px 0;
        }
        
        .yd-description li {
          padding: 4px 0;
          color: #666;
        }
        
        .yd-help {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
          font-size: 12px;
          color: #999;
        }
        
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    // Навешиваем обработчики
    const connectBtn = this.container.querySelector('.yd-connect-btn');
    const disconnectBtn = this.container.querySelector('.yd-disconnect-btn');
    const syncBtn = this.container.querySelector('.yd-sync-btn');
    const openDiskBtn = this.container.querySelector('.yd-open-btn');

    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.handleConnect());
    }
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => this.handleDisconnect());
    }
    if (syncBtn) {
      syncBtn.addEventListener('click', () => this.handleSync());
    }
    if (openDiskBtn) {
      openDiskBtn.addEventListener('click', () => window.open('https://disk.yandex.ru', '_blank'));
    }
  }

  renderConnected() {
    const spinningClass = this.isSyncing ? ' spinning' : '';
    
    return `
      <div class="yd-status">
        <span>✓</span>
        <span>Подключено</span>
      </div>
      
      <div class="yd-user">
        <span>👤</span>
        <span>Пользователь Яндекс</span>
      </div>
      
      <div class="yd-sync-info">
        <div class="yd-sync-time">
          <span class="${spinningClass}">🔄</span>
          <span>Синхронизация: ${this.formatLastSync(this.lastSyncTime)}</span>
        </div>
      </div>
      
      <div class="yd-actions">
        <button class="btn btn-primary yd-sync-btn" ${this.isSyncing ? 'disabled' : ''}>
          <span class="${spinningClass}">🔄</span>
          ${this.isSyncing ? 'Синхронизация...' : 'Синхронизировать'}
        </button>
        <button class="btn btn-secondary yd-open-btn">
          📂 Открыть Яндекс.Диск
        </button>
        <button class="btn btn-danger yd-disconnect-btn">
          ⏏️ Отключить
        </button>
      </div>
    `;
  }

  renderDisconnected() {
    return `
      <div class="yd-description">
        <p>Подключите Яндекс.Диск для хранения данных системы пожарной безопасности.</p>
        <ul>
          <li>✓ Все данные хранятся в JSON-файлах</li>
          <li>✓ Автоматическая синхронизация</li>
          <li>✓ Работа офлайн с кэшированием</li>
          <li>✓ Резервное копирование</li>
        </ul>
      </div>
      
      <button class="btn btn-primary yd-connect-btn" style="width: 100%; padding: 14px; font-size: 16px;">
        ☁️ Подключить Яндекс.Диск
      </button>
      
      <div class="yd-help">
        <span>⚠️</span>
        <span>Для подключения потребуется авторизация в Яндексе</span>
      </div>
    `;
  }

  setSyncing(isSyncing) {
    this.isSyncing = isSyncing;
    this.render(true);
  }

  setLastSyncTime(time) {
    this.lastSyncTime = time;
    this.render(true);
  }
}
