// js/pwa.js - PWA функционал

class PWAService {
  constructor() {
    this.swRegistration = null;
    this.deferredPrompt = null;
    this.isOnline = navigator.onLine;
    
    this.init();
  }

  async init() {
    // Регистрация Service Worker
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('[PWA] Service Worker зарегистрирован:', this.swRegistration);
        
        // Проверка обновлений
        this.checkForUpdates();
      } catch (error) {
        console.error('[PWA] Ошибка регистрации SW:', error);
      }
    }

    // Обработчики онлайн/офлайн
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Обработчик установки PWA
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });

    // Уведомление об успешной установке
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Приложение установлено');
      this.deferredPrompt = null;
      this.hideInstallPrompt();
    });

    // Сообщения от Service Worker
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_REQUESTED') {
          console.log('[PWA] Запрошена синхронизация от SW');
          if (window.app) {
            window.app.syncManager.sync();
          }
        }
      });
    }

    // Проверка статуса соединения
    this.updateOnlineStatus();
  }

  // ========== СТАТУС СОЕДИНЕНИЯ ==========

  handleOnline() {
    this.isOnline = true;
    this.updateOnlineStatus();
    showToast('🌐 Подключение к интернету восстановлено', 'success');
    
    // Синхронизация при подключении
    if (window.app) {
      window.app.syncManager.sync();
    }
  }

  handleOffline() {
    this.isOnline = false;
    this.updateOnlineStatus();
    showToast('⚠️ Работа в офлайн-режиме', 'warning');
  }

  updateOnlineStatus() {
    const statusEl = document.getElementById('onlineStatus');
    if (statusEl) {
      statusEl.textContent = this.isOnline ? '🟢 Онлайн' : '🔴 Офлайн';
      statusEl.className = this.isOnline ? 'online-status online' : 'online-status offline';
    }

    // Блокировка/разблокика функций
    const syncButton = document.getElementById('syncButton');
    if (syncButton) {
      syncButton.disabled = !this.isOnline;
      syncButton.title = this.isOnline ? 'Синхронизировать' : 'Нет подключения';
    }
  }

  // ========== УСТАНОВКА ПРИЛОЖЕНИЯ ==========

  showInstallPrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'installPrompt';
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
      <div class="install-prompt-content">
        <span class="install-prompt-icon">📲</span>
        <div class="install-prompt-text">
          <strong>Установить приложение</strong>
          <p>АСОПБ можно установить на домашний экран для быстрого доступа</p>
        </div>
        <div class="install-prompt-actions">
          <button class="btn btn-secondary" id="dismissInstall">Позже</button>
          <button class="btn btn-primary" id="confirmInstall">Установить</button>
        </div>
      </div>
    `;

    document.body.appendChild(prompt);

    // Показываем через 3 секунды
    setTimeout(() => {
      prompt.classList.add('active');
    }, 3000);

    // Обработчики кнопок
    document.getElementById('confirmInstall').addEventListener('click', () => {
      this.install();
    });

    document.getElementById('dismissInstall').addEventListener('click', () => {
      this.hideInstallPrompt();
    });
  }

  hideInstallPrompt() {
    const prompt = document.getElementById('installPrompt');
    if (prompt) {
      prompt.classList.remove('active');
      setTimeout(() => prompt.remove(), 300);
    }
  }

  async install() {
    if (!this.deferredPrompt) return;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    console.log('[PWA] Результат установки:', outcome);
    this.deferredPrompt = null;
    this.hideInstallPrompt();
  }

  // ========== ОБНОВЛЕНИЯ ==========

  async checkForUpdates() {
    if (!this.swRegistration) return;

    // Проверяем обновления каждые 5 минут
    setInterval(() => {
      this.swRegistration.update();
    }, 5 * 60 * 1000);

    // Слушаем обновления
    this.swRegistration.addEventListener('updatefound', () => {
      const newWorker = this.swRegistration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          this.showUpdatePrompt();
        }
      });
    });
  }

  showUpdatePrompt() {
    const prompt = document.createElement('div');
    prompt.id = 'updatePrompt';
    prompt.className = 'update-prompt';
    prompt.innerHTML = `
      <div class="update-prompt-content">
        <span class="update-prompt-icon">🔄</span>
        <div class="update-prompt-text">
          <strong>Доступно обновление</strong>
          <p>Новая версия приложения готова к установке</p>
        </div>
        <div class="update-prompt-actions">
          <button class="btn btn-secondary" id="dismissUpdate">Позже</button>
          <button class="btn btn-primary" id="confirmUpdate">Обновить</button>
        </div>
      </div>
    `;

    document.body.appendChild(prompt);

    setTimeout(() => {
      prompt.classList.add('active');
    }, 1000);

    document.getElementById('confirmUpdate').addEventListener('click', () => {
      if (this.swRegistration.waiting) {
        this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });

    document.getElementById('dismissUpdate').addEventListener('click', () => {
      prompt.classList.remove('active');
      setTimeout(() => prompt.remove(), 300);
    });
  }

  // ========== УВЕДОМЛЕНИЯ ==========

  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('[PWA] Уведомления не поддерживаются');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  showNotification(title, options = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const defaultOptions = {
      icon: '/fire.svg',
      badge: '/fire.svg',
      vibrate: [100, 50, 100],
      requireInteraction: true,
      actions: [
        { action: 'open-app', title: 'Открыть' }
      ]
    };

    new Notification(title, { ...defaultOptions, ...options });
  }

  // ========== ФОНОВАЯ СИНХРОНИЗАЦИЯ ==========

  async registerSyncTask(tag) {
    if ('serviceWorker' in navigator && 'sync' in window.SyncManager.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register(tag);
        console.log('[PWA] Задача синхронизации зарегистрирована:', tag);
      } catch (error) {
        console.error('[PWA] Ошибка регистрации синхронизации:', error);
      }
    }
  }

  // ========== КЭШИРОВАНИЕ ==========

  async precacheResources(resources) {
    if (!this.swRegistration) return;

    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(resources);
    console.log('[PWA] Ресурсы закэшированы:', resources);
  }

  // ========== ВЕРСИЯ ==========

  async getVersion() {
    if (!navigator.serviceWorker.controller) {
      return 'Нет версии';
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }
}

// Глобальный экземпляр
window.pwaService = new PWAService();

// Стили для prompt (если ещё не добавлены)
if (!document.getElementById('pwa-styles')) {
  const pwaStyleElement = document.createElement('style');
  pwaStyleElement.id = 'pwa-styles';
  pwaStyleElement.textContent = `
  .install-prompt, .update-prompt {
    position: fixed;
    bottom: -100px;
    left: 20px;
    right: 20px;
    max-width: 400px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 10000;
    transition: bottom 0.3s ease;
    overflow: hidden;
  }

  .install-prompt.active, .update-prompt.active {
    bottom: 20px;
  }

  .install-prompt-content, .update-prompt-content {
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .install-prompt-icon, .update-prompt-icon {
    font-size: 32px;
  }

  .install-prompt-text strong, .update-prompt-text strong {
    display: block;
    margin-bottom: 4px;
    color: #333;
  }

  .install-prompt-text p, .update-prompt-text p {
    margin: 0;
    font-size: 13px;
    color: #666;
  }

  .install-prompt-actions, .update-prompt-actions {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  .online-status {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
  }

  .online-status.online {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .online-status.offline {
    background: #ffebee;
    color: #c62828;
  }

  @media (max-width: 768px) {
    .install-prompt, .update-prompt {
      left: 10px;
      right: 10px;
      bottom: -100px;
    }

    .install-prompt.active, .update-prompt.active {
      bottom: 10px;
    }

    .install-prompt-content, .update-prompt-content {
      flex-direction: column;
      text-align: center;
    }

    .install-prompt-actions, .update-prompt-actions {
      width: 100%;
      margin-left: 0;
    }

    .install-prompt-actions button, .update-prompt-actions button {
      flex: 1;
    }
  }
`;
  document.head.appendChild(pwaStyleElement);
}
