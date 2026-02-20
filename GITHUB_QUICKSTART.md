# 🚀 Быстрая загрузка на GitHub

## 📋 Доступные скрипты

В проекте есть 3 скрипта для работы с GitHub:

| Файл | Описание | Для кого |
|------|----------|----------|
| **setup-git.bat** | Первая настройка Git | Все пользователи |
| **deploy.bat** | Загрузка в 1 клик (Windows) | Windows пользователи |
| **auto-deploy.ps1** | Загрузка с сообщением (PowerShell) | Продвинутые пользователи |

---

## 🔧 Быстрый старт

### Шаг 1: Первая настройка

1. **Запустите** `setup-git.bat`
2. **Введите** ваше имя и email
3. **Создайте** репозиторий на GitHub: https://github.com/new
4. **Имя репозитория:** `asopb-prototype`
5. **Выполните** команды из шага 5 (см. ниже)

### Шаг 2: Загрузка

**Вариант A (простой):**
1. Дважды кликните на `deploy.bat`
2. Введите сообщение коммита (или нажмите Enter)
3. Готово!

**Вариант B (PowerShell):**
1. Откройте PowerShell в папке проекта
2. Запустите: `.\auto-deploy.ps1`
3. Или с сообщением: `.\auto-deploy.ps1 -message "Добавлена новая функция"`

---

## 📝 Пошаговая инструкция

### 1. Установка Git

**Windows:**
1. Скачайте с https://git-scm.com/download/win
2. Установите с настройками по умолчанию
3. Перезапустите терминал/IDE

### 2. Первая настройка

Откройте PowerShell или Command Prompt в папке проекта:

```bash
# Настройка пользователя
git config --global user.name "Ваше Имя"
git config --global user.email "your-email@example.com"

# Инициализация
git init

# Добавление файлов
git add .

# Первый коммит
git commit -m "Initial commit: ASOPB prototype v0.5"
```

### 3. Создание репозитория на GitHub

1. Зайдите на https://github.com/new
2. **Repository name:** `asopb-prototype`
3. **Visibility:** Private или Public (на ваш выбор)
4. **НЕ нажимайте** "Initialize this repository with a README"
5. Нажмите **Create repository**

### 4. Привязка к GitHub

```bash
# Добавьте remote (замените YOUR_USERNAME на ваш ник)
git remote add origin https://github.com/YOUR_USERNAME/asopb-prototype.git

# Переименуйте ветку в main
git branch -M main

# Загрузите на GitHub
git push -u origin main
```

### 5. Последующие загрузки

```bash
# Добавление изменений
git add .

# Коммит
git commit -m "Ваше сообщение"

# Загрузка
git push
```

Или просто запустите `deploy.bat`

---

## 🔐 Аутентификация на GitHub

### Personal Access Token (рекомендуется)

1. Зайдите на https://github.com/settings/tokens
2. **Generate new token (classic)**
3. **Note:** `ASOPB Prototype`
4. **Expiration:** `No expiration` (или выберите срок)
5. **Scopes:** ✓ `repo` (полный доступ)
6. Нажмите **Generate token**
7. **Скопируйте токен** (показывается только один раз!)

При первом `git push` введите:
- **Username:** ваш ник GitHub
- **Password:** вставьте токен (не отобразится в консоли)

### GitHub Desktop (альтернатива)

1. Скачайте https://desktop.github.com/
2. Войдите в учётную запись
3. **File → Add Local Repository**
4. Выберите папку проекта
5. Нажмите **Commit** и **Push**

---

## 🌐 GitHub Pages (хостинг сайта)

### Включение

1. Зайдите в репозиторий на GitHub
2. **Settings → Pages**
3. **Source:** Deploy from a branch
4. **Branch:** main / root
5. Нажмите **Save**

### Доступ к сайту

Через 1-2 минуты сайт будет доступен по адресу:
```
https://YOUR_USERNAME.github.io/asopb-prototype/
```

### Автоматический деплой

Создайте папку `.github/workflows/` и файл `deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## ❓ Решение проблем

### Ошибка: "remote origin already exists"

```bash
git remote remove origin
git remote add origin https://github.com/USER/asopb-prototype.git
```

### Ошибка: "Authentication failed"

1. Создайте новый токен: https://github.com/settings/tokens
2. Обновите учётные данные:
   ```bash
   git credential-manager-core erase
   ```
3. При следующем push введите новый токен

### Ошибка: "Updates were rejected"

```bash
# Только если вы уверены, что нужно перезаписать историю!
git push -f origin main
```

Или:
```bash
# Синхронизация с удалённым репозиторием
git pull --rebase origin main
git push
```

### Ошибка: "Large files"

Если файл больше 100MB:

```bash
# Удалите большой файл из истории
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch PATH_TO_LARGE_FILE" \
  --prune-empty --tag-name-filter cat -- --all
  
git push -f origin main
```

Или добавьте в `.gitignore`:
```
*.zip
*.rar
>50MB
```

---

## 📊 Структура для GitHub

```
asopb-prototype/
├── .github/
│   └── workflows/
│       └── deploy.yml      # Авто-деплой на Pages
├── .gitignore              # Игнорируемые файлы
├── index.html              # Главная страница
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── setup-git.bat           # Первая настройка
├── deploy.bat              # Быстрая загрузка
├── auto-deploy.ps1         # Загрузка PowerShell
├── README.md               # Документация
├── GITHUB_DEPLOY.md        # Подробная инструкция
├── styles/
│   └── main.css
└── js/
    ├── *.js
    ├── services/
    │   └── *.js
    └── components/
        └── *.js
```

---

## 💡 Советы

✅ **Коммитьте часто** — по одному логическому изменению

✅ **Пишите понятные сообщения** — что и зачем изменили

✅ **Не коммитьте секреты** — токены, пароли, ключи API

✅ **Используйте .gitignore** — для временных файлов

✅ **Проверяйте перед push** — `git status` и `git diff`

✅ **Создавайте теги** для версий:
```bash
git tag v0.5
git push origin v0.5
```

---

## 📚 Дополнительные ресурсы

- **Git для начинающих:** https://git-scm.com/book/ru/v2
- **GitHub Docs:** https://docs.github.com/ru
- **GitHub Pages:** https://pages.github.com/
- **Git Cheat Sheet:** https://education.github.com/git-cheat-sheet-education.pdf

---

**Версия:** 1.0  
**Дата:** Февраль 2026
