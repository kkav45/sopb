// js/sync-manager.service.js

class SyncManagerService {
  constructor(yandexDisk, localCache) {
    this.yandexDisk = yandexDisk;
    this.localCache = localCache;
    this.isSyncing = false;
    this.syncInterval = null;
    this.onStatusChange = null;
    this.lastSyncTime = null;
  }

  setOnStatusChange(callback) {
    this.onStatusChange = callback;
  }

  // ========== АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ ==========

  startAutoSync(intervalMs = 30000) {
    this.stopAutoSync();
    this.syncInterval = setInterval(() => {
      this.sync();
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ========== ПОЛНАЯ СИНХРОНИЗАЦИЯ ==========

  async sync() {
    if (this.isSyncing) {
      return { status: 'already_syncing', uploaded: 0, downloaded: 0, conflicts: [], errors: [] };
    }

    this.isSyncing = true;
    this.notifyStatus('syncing');

    const result = {
      status: 'success',
      uploaded: 0,
      downloaded: 0,
      conflicts: [],
      errors: []
    };

    try {
      // Проверяем подключение к Яндекс.Диску
      if (!await this.yandexDisk.isAuthenticated()) {
        throw new Error('Not authenticated with Yandex Disk');
      }

      // 1. Отправляем изменения на Яндекс.Диск
      const pendingItems = await this.localCache.getPendingSyncItems();

      for (const item of pendingItems) {
        try {
          await this.yandexDisk.syncFile(item.path, item.data);
          await this.localCache.updateSyncQueueStatus(item.id, 'synced');
          result.uploaded++;
        } catch (error) {
          result.errors.push({
            path: item.path,
            error: error.message
          });
          await this.localCache.updateSyncQueueStatus(item.id, 'error', error.message);
        }
      }

      // 2. Обновляем метаданные синхронизации
      await this.updateSyncMetadata(result);
      this.lastSyncTime = new Date();

      result.status = result.errors.length > 0 ? 'error' : 'success';

    } catch (error) {
      result.status = 'error';
      result.errors.push({ error: error.message });
    } finally {
      this.isSyncing = false;
      this.notifyStatus(result.status, result);
    }

    return result;
  }

  // ========== ОБНОВЛЕНИЕ МЕТАДАННЫХ ==========

  async updateSyncMetadata(result) {
    const stats = await this.localCache.getStats();
    
    const metadata = {
      lastSyncAt: new Date().toISOString(),
      lastSyncUser: 'current-user',
      filesSynced: result.uploaded + result.downloaded,
      pendingChanges: stats.pendingSync,
      version: '1.0'
    };

    try {
      const exists = await this.yandexDisk.fileExists('metadata/sync-status.json');
      if (!exists) {
        await this.yandexDisk.createFolder('metadata');
      }
      await this.yandexDisk.writeFile('metadata/sync-status.json', metadata);
    } catch (error) {
      console.error('Failed to update sync metadata:', error);
    }
  }

  // ========== СТАТУС ==========

  isSyncingNow() {
    return this.isSyncing;
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }

  notifyStatus(status, result) {
    if (this.onStatusChange) {
      this.onStatusChange(status, result);
    }
  }
}
