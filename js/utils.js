// js/utils.js

// Генерация уникального ID
function generateId() {
  return crypto.randomUUID();
}

// Форматирование даты
function formatDate(date, options = {}) {
  const defaultOptions = { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(date).toLocaleDateString('ru-RU', { ...defaultOptions, ...options });
}

// Форматирование относительного времени
function formatRelativeTime(date) {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  if (hours < 24) return `${hours} ч назад`;
  if (days < 7) return `${days} дн назад`;
  return formatDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// Форматирование даты и времени
function formatDateTime(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Показ уведомления
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Добавление CSS для исчезновения тоста
const style = document.createElement('style');
style.textContent = `
  @keyframes toastSlideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// Глубокое клонирование объекта
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Проверка на пустой объект
function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

// Сохранение в localStorage
function saveToStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Загрузка из localStorage
function loadFromStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// URL параметры
function getUrlParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

// Debounce функция
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle функция
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Валидация email
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Маска для телефона
function formatPhone(phone) {
  return phone.replace(/[^0-9]/g, '')
    .replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 ($2) $3-$4-$5');
}

// Экспорт в CSV
function exportToCSV(data, filename) {
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => 
        JSON.stringify(row[header] || '')
      ).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Группировка массива по полю
function groupBy(array, key) {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
}

// Сортировка массива объектов
function sortBy(array, key, order = 'asc') {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'asc' ? comparison : -comparison;
  });
}

// Фильтрация массива по поиску
function filterBySearch(array, fields, query) {
  if (!query) return array;
  
  const lowerQuery = query.toLowerCase();
  return array.filter(item => 
    fields.some(field => 
      String(item[field] || '').toLowerCase().includes(lowerQuery)
    )
  );
}

// Пагинация массива
function paginate(array, page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  return {
    items: array.slice(start, end),
    total: array.length,
    page,
    pageSize,
    totalPages: Math.ceil(array.length / pageSize)
  };
}

// Экспорт функций в глобальную область
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatRelativeTime = formatRelativeTime;
window.generateId = generateId;
window.showToast = showToast;
