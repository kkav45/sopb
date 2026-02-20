// js/services/photo-service.js

class PhotoService {
  constructor() {
    this.video = null;
    this.canvas = null;
    this.stream = null;
    this.currentCamera = 'environment';
    this.photos = [];
    this.onPhotoTaken = null;
  }

  // Инициализация камеры
  async initCamera(videoElementId) {
    this.video = document.getElementById(videoElementId);
    if (!this.video) {
      console.error('Video element not found');
      return false;
    }

    try {
      const constraints = {
        video: {
          facingMode: this.currentCamera,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      
      return true;
    } catch (error) {
      console.error('Ошибка доступа к камере:', error);
      showToast('Не удалось получить доступ к камере', 'error');
      return false;
    }
  }

  // Переключение камеры
  async switchCamera() {
    this.currentCamera = this.currentCamera === 'environment' ? 'user' : 'environment';
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    return await this.initCamera('photoVideo');
  }

  // Сделать фото
  takePhoto() {
    if (!this.video || !this.video.videoWidth) {
      showToast('Камера не инициализирована', 'error');
      return null;
    }

    this.canvas = document.getElementById('photoCanvas');
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      document.body.appendChild(this.canvas);
      this.canvas.style.display = 'none';
    }

    // Устанавливаем размер canvas равный размеру видео
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;

    const ctx = this.canvas.getContext('2d');
    ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);

    // Получаем данные фото
    const imageData = this.canvas.toDataURL('image/jpeg', 0.85);
    
    // Создаём объект фото
    const photo = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      data: imageData,
      width: this.canvas.width,
      height: this.canvas.height
    };

    this.photos.push(photo);
    
    // Уведомляем о новом фото
    if (this.onPhotoTaken) {
      this.onPhotoTaken(photo);
    }

    // Показываем превью
    this.showPreview(photo);

    // Звук затвора
    this.playShutterSound();

    return photo;
  }

  // Показать превью
  showPreview(photo) {
    const container = document.getElementById('photoPreviewContainer');
    if (!container) return;

    const preview = document.createElement('div');
    preview.className = 'photo-preview-item';
    preview.style.cssText = `
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    preview.innerHTML = `
      <img src="${photo.data}" style="width: 100%; height: 100px; object-fit: cover;">
      <button class="photo-delete-btn" data-photo-id="${photo.id}" style="
        position: absolute;
        top: 4px;
        right: 4px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: none;
        background: rgba(220, 53, 69, 0.9);
        color: white;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">&times;</button>
    `;

    // Обработчик удаления
    preview.querySelector('.photo-delete-btn').addEventListener('click', () => {
      this.deletePhoto(photo.id);
      preview.remove();
    });

    container.appendChild(preview);
  }

  // Удалить фото
  deletePhoto(photoId) {
    this.photos = this.photos.filter(p => p.id !== photoId);
  }

  // Загрузить фото из файла
  async loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const photo = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          data: e.target.result,
          width: 0,
          height: 0,
          fileName: file.name
        };

        // Получаем размеры изображения
        const img = new Image();
        img.onload = () => {
          photo.width = img.width;
          photo.height = img.height;
          this.photos.push(photo);
          
          if (this.onPhotoTaken) {
            this.onPhotoTaken(photo);
          }
          
          this.showPreview(photo);
          resolve(photo);
        };
        img.src = photo.data;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Загрузить несколько файлов
  async loadFromFiles(files) {
    const photos = [];
    for (const file of files) {
      try {
        const photo = await this.loadFromFile(file);
        photos.push(photo);
      } catch (error) {
        console.error('Ошибка загрузки файла:', error);
      }
    }
    return photos;
  }

  // Очистить все фото
  clear() {
    this.photos = [];
    const container = document.getElementById('photoPreviewContainer');
    if (container) {
      container.innerHTML = '';
    }
  }

  // Получить все фото
  getPhotos() {
    return this.photos;
  }

  // Остановить камеру
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  // Звук затвора
  playShutterSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // Игнорируем ошибки аудио
    }
  }

  // Экспорт фото в Blob
  async photoToBlob(photo, type = 'image/jpeg') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, type, 0.85);
      };
      img.onerror = reject;
      img.src = photo.data;
    });
  }

  // Сохранить фото на Яндекс.Диск
  async saveToYandexDisk(yandexDisk, path, photo) {
    const blob = await this.photoToBlob(photo);
    const file = new File([blob], `${photo.id}.jpg`, { type: 'image/jpeg' });
    
    await yandexDisk.uploadFile(path, file);
  }
}

// Глобальный сервис
window.photoService = new PhotoService();
