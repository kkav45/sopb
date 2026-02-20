// js/services/storage-service.js

class StorageService {
  constructor() {
    this.prefix = 'asopb_';
    this.supportsLocalStorage = this.checkSupport();
  }

  // Проверка поддержки localStorage
  checkSupport() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage не доступен:', e);
      return false;
    }
  }

  // Сохранение данных
  set(key, data) {
    if (!this.supportsLocalStorage) {
      console.warn('localStorage не доступен, используем память');
      return this.setInMemory(key, data);
    }

    try {
      const fullKey = this.prefix + key;
      const serialized = JSON.stringify({
        data: data,
        timestamp: Date.now(),
        version: 1
      });
      localStorage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      console.error('Ошибка записи в localStorage:', error);
      
      // Если квота превышена, пробуем очистить старые данные
      if (error.name === 'QuotaExceededError') {
        this.clearOldData();
        return this.set(key, data);
      }
      
      return false;
    }
  }

  // Чтение данных
  get(key, defaultValue = null) {
    if (!this.supportsLocalStorage) {
      return this.getFromMemory(key, defaultValue);
    }

    try {
      const fullKey = this.prefix + key;
      const serialized = localStorage.getItem(fullKey);
      
      if (serialized === null) {
        return defaultValue;
      }

      const parsed = JSON.parse(serialized);
      return parsed.data;
    } catch (error) {
      console.error('Ошибка чтения из localStorage:', error);
      return defaultValue;
    }
  }

  // Удаление данных
  remove(key) {
    if (!this.supportsLocalStorage) {
      return this.removeFromMemory(key);
    }

    try {
      const fullKey = this.prefix + key;
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error('Ошибка удаления из localStorage:', error);
      return false;
    }
  }

  // Очистка всех данных
  clear() {
    if (!this.supportsLocalStorage) {
      return this.clearMemory();
    }

    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Ошибка очистки localStorage:', error);
      return false;
    }
  }

  // Получение всех ключей
  keys() {
    if (!this.supportsLocalStorage) {
      return Object.keys(this.memoryStorage);
    }

    const keys = [];
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        keys.push(key.replace(this.prefix, ''));
      }
    });
    return keys;
  }

  // Проверка существования ключа
  has(key) {
    if (!this.supportsLocalStorage) {
      return key in this.memoryStorage;
    }

    const fullKey = this.prefix + key;
    return localStorage.getItem(fullKey) !== null;
  }

  // Получение размера хранилища
  getSize() {
    if (!this.supportsLocalStorage) {
      return 0;
    }

    let totalSize = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        totalSize += localStorage[key].length * 2; // 2 байта на символ
      }
    });
    return totalSize;
  }

  // Получение статистики
  getStats() {
    const keys = this.keys();
    const size = this.getSize();
    
    return {
      keys: keys.length,
      size: size,
      sizeFormatted: this.formatBytes(size),
      available: this.supportsLocalStorage,
      timestamp: new Date().toISOString()
    };
  }

  // Очистка старых данных (простейшая стратегия LRU)
  clearOldData() {
    if (!this.supportsLocalStorage) return;

    const entries = [];
    
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        try {
          const data = JSON.parse(localStorage[key]);
          entries.push({
            key: key,
            timestamp: data.timestamp || 0
          });
        } catch (e) {
          // Игнорируем повреждённые данные
        }
      }
    });

    // Сортируем по времени (старые первые)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Удаляем 50% самых старых записей
    const toDelete = Math.floor(entries.length / 2);
    for (let i = 0; i < toDelete; i++) {
      localStorage.removeItem(entries[i].key);
    }
  }

  // Форматирование размера
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ========== Резервное хранение в памяти ==========
  
  memoryStorage = {};

  setInMemory(key, data) {
    const fullKey = this.prefix + key;
    this.memoryStorage[fullKey] = {
      data: data,
      timestamp: Date.now(),
      version: 1
    };
    return true;
  }

  getFromMemory(key, defaultValue) {
    const fullKey = this.prefix + key;
    const entry = this.memoryStorage[fullKey];
    return entry ? entry.data : defaultValue;
  }

  removeFromMemory(key) {
    const fullKey = this.prefix + key;
    delete this.memoryStorage[fullKey];
    return true;
  }

  clearMemory() {
    Object.keys(this.memoryStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        delete this.memoryStorage[key];
      }
    });
    return true;
  }

  // ========== Экспорт/Импорт данных ==========

  // Экспорт всех данных в JSON
  exportData() {
    const data = {};
    this.keys().forEach(key => {
      data[key] = this.get(key);
    });
    
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data: data
    };
  }

  // Импорт данных из JSON
  importData(exportedData) {
    if (!exportedData || !exportedData.data) {
      throw new Error('Неверный формат данных для импорта');
    }

    Object.keys(exportedData.data).forEach(key => {
      this.set(key, exportedData.data[key]);
    });

    return true;
  }

  // Скачивание экспорта как файл
  downloadExport(filename = 'asopb-backup.json') {
    const data = this.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Загрузка импорта из файла
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          this.importData(data);
          resolve(true);
        } catch (error) {
          reject(new Error('Ошибка чтения файла: ' + error.message));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Ошибка чтения файла'));
      };
      
      reader.readAsText(file);
    });
  }
}

// Глобальный экземпляр
window.storageService = new StorageService();
