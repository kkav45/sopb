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
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'disk:app_folder'
    });
    return `https://oauth.yandex.ru/authorize?${params}`;
  }

  async exchangeCodeForToken(code) {
    const response = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`OAuth error: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    this.token = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000
    };
    this.saveToken();
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

  async createFolder(path) {
    const fullPath = `disk:/${this.config.rootFolder}/${path}`;
    await this.request(`/resources?path=${encodeURIComponent(fullPath)}`, {
      method: 'PUT'
    });
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
    if (!this.token) return false;
    if (Date.now() >= this.token.expiresAt - 60000) {
      try {
        await this.refreshAccessToken();
        return true;
      } catch {
        return false;
      }
    }
    return true;
  }

  getTokenInfo() {
    return this.token;
  }
}

// Конфигурация по умолчанию (замените на свои данные после регистрации)
const YANDEX_CONFIG = {
  clientId: 'YOUR_CLIENT_ID',
  clientSecret: 'YOUR_CLIENT_SECRET',
  redirectUri: window.location.origin + '/auth/yandex/callback',
  rootFolder: 'ASOPB'
};
