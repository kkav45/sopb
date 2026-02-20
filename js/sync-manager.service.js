// js/sync-manager.service.js

class SyncManagerService {
  constructor(yandexDisk, localCache) {
    this.yandexDisk = yandexDisk || window.yandexDisk;
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
      if (!this.yandexDisk || !await this.yandexDisk.isAuthenticated()) {
        console.log('Яндекс.Диск не подключён, работаем локально');
        result.status = 'local_only';
        this.isSyncing = false;
        this.notifyStatus('local_only', result);
        return result;
      }

      // Создаём корневую папку ASOPB если не существует
      try {
        await this.yandexDisk.createFolder('');
      } catch (error) {
        console.log('Папка ASOPB уже существует или ошибка создания:', error.message);
      }

      // 1. Отправляем изменения на Яндекс.Диск
      const pendingItems = await this.localCache.getPendingSyncItems();

      for (const item of pendingItems) {
        try {
          // Создаём подпапку если нужно
          const folder = item.path.substring(0, item.path.lastIndexOf('/'));
          if (folder) {
            try {
              await this.yandexDisk.createFolder(folder);
            } catch (folderError) {
              // Папка уже существует
            }
          }

          if (item.action === 'delete') {
            try {
              await this.yandexDisk.deleteFile(item.path);
            } catch (deleteError) {
              // Файл не существует
            }
          } else {
            await this.yandexDisk.writeFile(item.path, item.data);
          }
          await this.localCache.updateSyncQueueStatus(item.id, 'synced');
          result.uploaded++;
        } catch (error) {
          console.error('Ошибка синхронизации файла:', item.path, error);
          result.errors.push({
            path: item.path,
            error: error.message
          });
          await this.localCache.updateSyncQueueStatus(item.id, 'error', error.message);
        }
      }

      // 2. Скачиваем изменения с Яндекс.Диска
      await this.downloadChanges(result);

      // 3. Обновляем метаданные синхронизации
      await this.updateSyncMetadata(result);
      this.lastSyncTime = new Date();

      result.status = result.errors.length > 0 ? 'error' : 'success';

    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      result.status = 'error';
      result.errors.push({ error: error.message });
    } finally {
      this.isSyncing = false;
      this.notifyStatus(result.status, result);
    }

    return result;
  }

  // ========== ЗАГРУЗКА ИЗМЕНЕНИЙ С ДИСКА ==========

  async downloadChanges(result) {
    try {
      // Список файлов для синхронизации
      const fileLists = [
        { prefix: 'objects/', store: 'objects', idPrefix: 'obj-' },
        { prefix: 'equipment/', store: 'equipment', idPrefix: 'eq-' },
        { prefix: 'inspections/', store: 'inspections', idPrefix: 'insp-' },
        { prefix: 'violations/', store: 'violations', idPrefix: 'viol-' }
      ];

      for (const { prefix, store, idPrefix } of fileLists) {
        const files = await this.yandexDisk.listFiles(prefix);

        for (const file of files) {
          if (file.type === 'file' && file.name.endsWith('.json')) {
            try {
              const remoteData = await this.yandexDisk.readFile(file.path);
              
              // Извлекаем ID из имени файла (obj-xxx.json -> xxx)
              const fileName = file.name.replace('.json', '');
              const id = fileName.replace(idPrefix, '');
              
              const localData = await this.localCache.get(store, id);

              // Сравниваем версии
              if (!localData || (remoteData.version && localData.version < remoteData.version)) {
                await this.localCache.set(store, remoteData);
                result.downloaded++;
              }
            } catch (error) {
              console.error('Ошибка загрузки файла:', file.path, error);
              result.errors.push({ path: file.path, error: error.message });
            }
          }
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке изменений:', error);
      result.errors.push({ error: 'download: ' + error.message });
    }
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
      // Создаём папку metadata если не существует
      try {
        await this.yandexDisk.createFolder('metadata');
      } catch (folderError) {
        // Папка уже существует
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
