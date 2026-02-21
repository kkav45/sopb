// js/yandex-disk.service.js

class YandexDiskService {
  constructor(config) {
    this.config = config;
    this.token = null;
    this.loadToken();
  }

  // ========== АВТОРИЗАЦИЯ ==========

  getAuthUrl() {
    const params = new URLSearchParams({
      response_type: 'token',  // Implicit Flow для клиентских приложений
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'cloud_api:disk_app_folder',  // ✅ Разрешение из Яндекс OAuth
      force_confirm: 'yes'  // Принудительно показать окно подтверждения
    });

    const authUrl = `https://oauth.yandex.ru/authorize?${params}`;
    console.log('[YandexDisk] Auth URL:', authUrl);
    return authUrl;
  }

  // Обработка токена из callback (yandex-auth-callback.html)
  async handleCallback() {
    const hash = window.location.hash;
    if (!hash || !hash.includes('access_token')) {
      return null;
    }

    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const expiresIn = hashParams.get('expires_in');

    if (!accessToken) {
      return null;
    }

    this.token = {
      accessToken: accessToken,
      refreshToken: null,
      expiresAt: Date.now() + (parseInt(expiresIn) || 31536000) * 1000
    };
    this.saveToken();

    // Очищаем hash
    window.history.replaceState({}, '', window.location.pathname);

    return this.token;
  }

  async exchangeCodeForToken(code) {
    // Этот метод больше не используется для Implicit Flow
    console.warn('exchangeCodeForToken устарел. Используйте handleCallback()');
    return this.token;
  }

  async refreshAccessToken() {
    if (!this.token?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.token.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || this.token.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000
    };
    this.saveToken();
    return this.token;
  }

  async getValidToken() {
    if (!this.token || Date.now() >= this.token.expiresAt - 60000) {
      await this.refreshAccessToken();
    }
    return this.token.accessToken;
  }

  // ========== РАБОТА С ФАЙЛАМИ ==========

  async request(endpoint, options = {}) {
    const token = await this.getValidToken();
    const response = await fetch(`https://cloud-api.yandex.net/v1/disk${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `OAuth ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Yandex Disk API error: ${error.error || response.statusText}`);
    }

    return response.json();
  }

  // Создание всех необходимых папок при первом подключении
  async createAppFolders() {
    console.log('[YandexDisk] Creating application folders...');

    const folders = [
      '',                    // Корневая папка ASOPB
      'objects',            // Объекты
      'equipment',          // Оборудование
      'inspections',        // Проверки
      'violations',         // Нарушения
      'metadata'            // Метаданные
    ];

    for (const folder of folders) {
      await this.createFolder(folder);
    }

    console.log('[YandexDisk] All folders created/verified');
  }

  // Проверка структуры папок
  async checkFolderStructure() {
    const requiredFolders = [
      'objects',
      'equipment',
      'inspections',
      'violations'
    ];

    const missing = [];

    for (const folder of requiredFolders) {
      const exists = await this.fileExists(folder);
      if (!exists) {
        missing.push(folder);
      }
    }

    if (missing.length > 0) {
      console.log('[YandexDisk] Missing folders:', missing);
      await this.createAppFolders();
      return false;
    }

    return true;
  }

  async createFolder(path) {
    // Если путь пустой, создаём корневую папку
    const folderPath = path ? `${this.config.rootFolder}/${path}` : this.config.rootFolder;
    const fullPath = `disk:/${folderPath}`;

    console.log('[YandexDisk] Creating folder:', fullPath);

    try {
      const response = await fetch(`https://cloud-api.yandex.net/v1/disk/resources?path=${encodeURIComponent(fullPath)}`, {
        method: 'PUT',
        headers: {
          'Authorization': `OAuth ${this.token.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('[YandexDisk] Folder created:', fullPath);
      } else if (response.status === 409) {
        console.log('[YandexDisk] Folder already exists:', fullPath);
      } else {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        console.error('[YandexDisk] Error creating folder:', error);
      }
    } catch (error) {
      console.error('[YandexDisk] Exception creating folder:', error);
    }
  }

  async readFile(path) {
    const fullPath = `disk:/${this.config.rootFolder}/${path}`;
    const { file } = await this.request(`/resources/download?path=${encodeURIComponent(fullPath)}`);

    const response = await fetch(file);
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    return response.json();
  }

  async writeFile(path, data) {
    const fullPath = `disk:/${this.config.rootFolder}/${path}`;
    const { href } = await this.request(`/resources/upload?path=${encodeURIComponent(fullPath)}&overwrite=true`);

    const uploadResponse = await fetch(href, {
      method: 'PUT',
      body: JSON.stringify(data, null, 2),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }
  }

  async uploadFile(path, file) {
    const fullPath = `disk:/${this.config.rootFolder}/${path}`;
    const { href } = await this.request(`/resources/upload?path=${encodeURIComponent(fullPath)}&overwrite=true`);

    const uploadResponse = await fetch(href, {
      method: 'PUT',
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }
  }

  async deleteFile(path) {
    const fullPath = `disk:/${this.config.rootFolder}/${path}`;
    await this.request(`/resources?path=${encodeURIComponent(fullPath)}`, {
      method: 'DELETE'
    });
  }

  async listFiles(path = '') {
    const fullPath = `disk:/${this.config.rootFolder}/${path}`;
    const result = await this.request(`/resources?path=${encodeURIComponent(fullPath)}&limit=100`);

    if (!result._embedded?.items) {
      return [];
    }

    return result._embedded.items.map(item => ({
      name: item.name,
      path: item.path.replace(`disk:/${this.config.rootFolder}/`, ''),
      type: item.type,
      size: item.size,
      modified: item.modified,
      mimeType: item.mime_type
    }));
  }

  async fileExists(path) {
    try {
      const fullPath = `disk:/${this.config.rootFolder}/${path}`;
      await this.request(`/resources?path=${encodeURIComponent(fullPath)}`);
      return true;
    } catch {
      return false;
    }
  }

  // ========== СИНХРОНИЗАЦИЯ ==========

  async syncFile(path, localData) {
    const exists = await this.fileExists(path);

    if (exists) {
      const remoteData = await this.readFile(path);

      if (localData.version > remoteData.version) {
        await this.writeFile(path, localData);
      } else if (localData.version < remoteData.version) {
        throw new Error(`Conflict: remote version is newer (${remoteData.version} > ${localData.version})`);
      }
    } else {
      await this.writeFile(path, localData);
    }
  }

  // ========== УТИЛИТЫ ==========

  saveToken() {
    localStorage.setItem('yandex-disk-token', JSON.stringify(this.token));
  }

  loadToken() {
    const stored = localStorage.getItem('yandex-disk-token');
    if (stored) {
      try {
        this.token = JSON.parse(stored);
      } catch {
        this.token = null;
      }
    }
  }

  async disconnect() {
    this.token = null;
    localStorage.removeItem('yandex-disk-token');
  }

  async isAuthenticated() {
    if (!this.token) {
      console.log('[YandexDisk] Not authenticated: no token');
      return false;
    }

    // Проверяем срок действия токена
    if (Date.now() >= this.token.expiresAt) {
      console.log('[YandexDisk] Token expired');
      return false;
    }

    // Если токен истекает в ближайшие 5 минут, помечаем как неактивный
    if (Date.now() >= this.token.expiresAt - 300000) {
      console.log('[YandexDisk] Token expiring soon');
      return false;
    }

    // Для Implicit Flow refreshToken отсутствует, проверяем по времени
    if (!this.token.refreshToken) {
      // Токен действителен, но не проверяли API
      // Возвращаем true для UI, но синхронизация должна проверить API
      return true;
    }

    // Есть refreshToken - пробуем обновить
    try {
      await this.refreshAccessToken();
      return true;
    } catch {
      console.log('[YandexDisk] Token refresh failed');
      return false;
    }
  }

  // Проверка токена через API (для синхронизации)
  async validateTokenWithAPI() {
    if (!this.token) {
      console.log('[YandexDisk] Validate API: No token');
      return false;
    }

    console.log('[YandexDisk] Validate API: Checking token...');
    console.log('[YandexDisk] Token expiresAt:', new Date(this.token.expiresAt).toISOString());
    console.log('[YandexDisk] Token expired:', Date.now() >= this.token.expiresAt);

    try {
      const result = await this.request('/resources?limit=1');
      console.log('[YandexDisk] Validate API: Success', result);
      return true;
    } catch (error) {
      console.log('[YandexDisk] Validate API: Failed:', error.message);
      // Токен недействителен - удаляем
      this.disconnect();
      return false;
    }
  }

  getTokenInfo() {
    return this.token;
  }
}

// ============================================================
// КОНФИГУРАЦИЯ ИНТЕГРАЦИИ С ЯНДЕКС.ДИСКОМ
// ============================================================
// Инструкция: YANDEX_QUICKSTART.md
// Регистрация OAuth: https://oauth.yandex.ru/client/new
//
// OAuth приложение:
// - Client ID: 2a94b6a0e172478fb391f58901a12446
// - Client Secret: e0ba060b4e3546dab8a5f811d60fac4c
// - Разрешения: cloud_api:disk_app_folder
// - Redirect URI: https://kkav45.github.io/sopb/yandex-auth-callback.html

const YANDEX_CONFIG = {
  // Client ID (из https://oauth.yandex.ru/client/new)
  clientId: '2a94b6a0e172478fb391f58901a12446',

  // Client Secret (из https://oauth.yandex.ru/client/new)
  // ⚠️ НЕ ПЕРЕДАВАТЬ на клиент! Используется только для серверной авторизации.
  // Для Implicit Flow (response_type=token) clientSecret не требуется.
  clientSecret: 'e0ba060b4e3546dab8a5f811d60fac4c',

  // Redirect URI (должен ТОЧНО совпадать с настройками в Яндекс OAuth)
  // Для GitHub Pages:
  redirectUri: 'https://kkav45.github.io/sopb/yandex-auth-callback.html',

  // Корневая папка на Яндекс.Диске
  rootFolder: 'ASOPB',

  // Scope для доступа к папке приложения (cloud_api:disk_app_folder)
  scope: 'cloud_api:disk_app_folder'
};

// ============================================================
