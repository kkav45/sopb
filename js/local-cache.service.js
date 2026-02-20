// js/local-cache.service.js

class LocalCacheService {
  constructor() {
    this.dbName = 'ASOPB_Cache';
    this.version = 1;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Хранилище для объектов
        if (!db.objectStoreNames.contains('objects')) {
          db.createObjectStore('objects', { keyPath: 'id' });
        }
        // Хранилище для оборудования
        if (!db.objectStoreNames.contains('equipment')) {
          db.createObjectStore('equipment', { keyPath: 'id' });
        }
        // Хранилище для проверок
        if (!db.objectStoreNames.contains('inspections')) {
          db.createObjectStore('inspections', { keyPath: 'id' });
        }
        // Хранилище для систем
        if (!db.objectStoreNames.contains('systems')) {
          db.createObjectStore('systems', { keyPath: 'id' });
        }
        // Хранилище для документов
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents', { keyPath: 'id' });
        }
        // Хранилище для очереди синхронизации
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('action', 'action', { unique: false });
        }
      };
    });
  }

  async get(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async set(storeName, entry) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ========== ОЧЕРЕДЬ СИНХРОНИЗАЦИИ ==========

  async addToSyncQueue(action, path, data) {
    const id = generateId();
    const item = {
      id,
      action,
      path,
      data,
      createdAt: Date.now(),
      status: 'pending'
    };

    await this.set('syncQueue', item);
    return id;
  }

  async getPendingSyncItems() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueStatus(id, status, error) {
    const entry = await this.get('syncQueue', id);
    if (entry) {
      entry.data.status = status;
      if (error) {
        entry.data.error = error;
      }
      await this.set('syncQueue', entry);
    }
  }

  async removeFromSyncQueue(id) {
    await this.delete('syncQueue', id);
  }

  async clearSyncQueue() {
    const items = await this.getAll('syncQueue');
    const tx = this.db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    items.forEach(item => {
      if (item.data.status === 'synced') {
        store.delete(item.id);
      }
    });
  }

  // ========== СТАТИСТИКА ==========

  async getStats() {
    const [objects, equipment, inspections, pendingSync] = await Promise.all([
      this.getAll('objects'),
      this.getAll('equipment'),
      this.getAll('inspections'),
      this.getPendingSyncItems()
    ]);

    return {
      objects: objects.length,
      equipment: equipment.length,
      inspections: inspections.length,
      pendingSync: pendingSync.length
    };
  }

  // ========== ОЧИСТКА ==========

  async clear() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
