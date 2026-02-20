# 🚀 Автоматическая загрузка на GitHub

## Способ 1: GitHub Desktop (рекомендуется для Windows)

### 1. Установка GitHub Desktop

1. Скачайте с https://desktop.github.com/
2. Установите и войдите в учётную запись GitHub

### 2. Добавление репозитория

1. Откройте GitHub Desktop
2. **File → Add Local Repository**
3. Выберите папку: `d:\! Открытая платформа безопасности\!!!! Сайт\АСОПБ v 0.4 (моб)\asopb-html-prototype`
4. Нажмите **Add Repository**

### 3. Первая публикация

1. Нажмите **Publish Repository**
2. Введите имя: `asopb-prototype`
3. Выберите **Private** (приватный) или **Public**
4. Нажмите **Publish**

### 4. Автоматическая синхронизация

- GitHub Desktop автоматически отслеживает изменения
- Нажмите **Commit to main** для сохранения
- Нажмите **Push origin** для загрузки на GitHub

---

## Способ 2: Git Command Line + PowerShell скрипт

### 1. Установка Git

1. Скачайте с https://git-scm.com/download/win
2. Установите с настройками по умолчанию

### 2. Настройка Git

```bash
git config --global user.name "Ваше Имя"
git config --global user.email "your-email@example.com"
```

### 3. Инициализация репозитория

```bash
cd "d:\! Открытая платформа безопасности\!!!! Сайт\АСОПБ v 0.4 (моб)\asopb-html-prototype"
git init
git add .
git commit -m "Initial commit: АСОПБ прототип v0.5"
```

### 4. Создание репозитория на GitHub

1. Зайдите на https://github.com/new
2. Имя репозитория: `asopb-prototype`
3. Выберите Private/Public
4. **Не нажимайте** "Initialize this repository with a README"
5. Нажмите **Create repository**

### 5. Привязка к удалённому репозиторию

```bash
git remote add origin https://github.com/ВАШ_НИК/asopb-prototype.git
git branch -M main
git push -u origin main
```

---

## Способ 3: Автоматический скрипт PowerShell

### Скрипт auto-deploy.ps1

Создайте файл `auto-deploy.ps1` в корне проекта:

```powershell
# auto-deploy.ps1 - Автоматическая загрузка на GitHub

param(
    [string]$message = "Auto commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

Write-Host "🚀 Автоматическая загрузка на GitHub..." -ForegroundColor Cyan
Write-Host ""

# Проверка Git
try {
    $gitVersion = git --version 2>&1
    Write-Host "✓ Git найден: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git не найден! Установите с https://git-scm.com/" -ForegroundColor Red
    exit 1
}

# Переход в директорию проекта
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

Write-Host "📁 Путь: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Проверка статуса
Write-Host "📊 Проверка изменений..." -ForegroundColor Cyan
$status = git status --porcelain

if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "✓ Изменений нет" -ForegroundColor Green
    exit 0
}

# Вывод изменений
Write-Host "📝 Найдены изменения:" -ForegroundColor Yellow
git status --short
Write-Host ""

# Добавление файлов
Write-Host "➕ Добавление файлов..." -ForegroundColor Cyan
git add .

# Коммит
Write-Host "💾 Создание коммита..." -ForegroundColor Cyan
git commit -m $message

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Коммит создан" -ForegroundColor Green
} else {
    Write-Host "✗ Ошибка коммита" -ForegroundColor Red
    exit 1
}

# Push на GitHub
Write-Host "📤 Загрузка на GitHub..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Загрузка завершена успешно!" -ForegroundColor Green
    Write-Host ""
    
    # Получение имени репозитория
    $repoUrl = git remote get-url origin
    $repoName = ($repoUrl -split '/')[-1] -replace '.git$', ''
    
    Write-Host "🔗 Ссылка на репозиторий:" -ForegroundColor Cyan
    Write-Host "   $repoUrl" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "✗ Ошибка загрузки на GitHub" -ForegroundColor Red
    Write-Host "   Проверьте подключение к интернету и права доступа" -ForegroundColor Yellow
    exit 1
}
```

### Использование скрипта

1. Откройте PowerShell в папке проекта
2. Разрешите выполнение скриптов:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ```
3. Запустите скрипт:
   ```powershell
   .\auto-deploy.ps1
   ```
4. Или с сообщением:
   ```powershell
   .\auto-deploy.ps1 -message "Добавлена новая функция"
   ```

---

## Способ 4: GitHub Actions (автоматически при изменении файлов)

### .github/workflows/deploy.yml

Создайте структуру папок и файл:

```
asopb-html-prototype/
├── .github/
│   └── workflows/
│       └── deploy.yml
└── ...
```

**Содержимое deploy.yml:**

```yaml
name: Auto Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

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

### Настройка GitHub Pages

1. Зайдите в репозиторий на GitHub
2. **Settings → Pages**
3. **Source:** Deploy from a branch
4. **Branch:** main / root
5. Нажмите **Save**

Через 1-2 минуты сайт будет доступен по адресу:
```
https://ВАШ_НИК.github.io/asopb-prototype/
```

---

## Способ 5: Batch-скрипт для Windows

### deploy.bat

Создайте файл `deploy.bat`:

```batch
@echo off
chcp 65001 >nul
echo ========================================
echo   Автоматическая загрузка на GitHub
echo ========================================
echo.

:: Проверка Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git не найден!
    echo Установите с https://git-scm.com/
    pause
    exit /b 1
)

echo [OK] Git найден
echo.

:: Статус
echo Проверка изменений...
git status --short
echo.

:: Добавление
echo Добавление файлов...
git add .

:: Коммит
set /p message="Введите сообщение коммита (или Enter для авто): "
if "%message%"=="" set message=Auto commit %date% %time%

echo Коммит: %message%
git commit -m "%message%"

if %errorlevel% neq 0 (
    echo [INFO] Нет изменений для коммита
    pause
    exit /b 0
)

:: Push
echo.
echo Загрузка на GitHub...
git push

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   [SUCCESS] Загрузка завершена!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   [ERROR] Ошибка загрузки!
    echo ========================================
)

pause
```

### Использование

Просто дважды кликните на `deploy.bat`

---

## .gitignore для проекта

Создайте файл `.gitignore`:

```gitignore
# Системные файлы
.DS_Store
Thumbs.db
desktop.ini

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Временные файлы
*.log
*.tmp
*.temp

# Node modules (если будет использоваться)
node_modules/
package-lock.json

# Скомпилированные файлы
*.pyc
__pycache__/

# Локальные конфиги
*.local.json
.local.env

# Токены и секреты (ВАЖНО!)
*.key
*.secret
*.token
credentials.json

# Большие файлы
*.zip
*.rar
*.7z
>100MB

# База данных (если локальная)
*.sqlite
*.db
```

---

## Быстрый старт (пошагово)

### Для новичков:

1. **Установите GitHub Desktop** (Способ 1)
2. **Создайте аккаунт** на https://github.com
3. **Добавьте репозиторий** через File → Add Local Repository
4. **Нажмите Publish** для первой загрузки
5. **Используйте Commit + Push** для последующих загрузок

### Для продвинутых:

1. **Установите Git**
2. **Создайте .gitignore**
3. **Инициализируйте репозиторий:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
4. **Создайте репозиторий** на GitHub
5. **Привяжите и загрузите:**
   ```bash
   git remote add origin https://github.com/USER/asopb-prototype.git
   git push -u origin main
   ```

### Для автоматизации:

1. **Создайте auto-deploy.ps1**
2. **Запускайте после изменений:**
   ```powershell
   .\auto-deploy.ps1
   ```

---

## Полезные команды Git

```bash
# Проверка статуса
git status

# Просмотр истории
git log --oneline

# Отмена коммита (до push)
git reset HEAD~1

# Отмена изменений в файле
git checkout -- filename

# Ветка
git branch -M main

# Принудительный push (осторожно!)
git push -f origin main
```

---

## Советы

✅ **Делайте коммиты часто** — по одному логическому изменению

✅ **Пишите понятные сообщения** — что и зачем изменили

✅ **Не коммитьте секреты** — токены, пароли, ключи API

✅ **Используйте .gitignore** — для временных файлов

✅ **Проверяйте перед push** — `git status` и `git diff`

---

**Версия:** 1.0  
**Дата:** Февраль 2026
