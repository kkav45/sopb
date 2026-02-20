# auto-deploy.ps1 - Автоматическая загрузка на GitHub
# Использование: .\auto-deploy.ps1 -message "Ваше сообщение"
# Репозиторий: https://github.com/kkav45/sopb.git

param(
    [string]$message = "Auto commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
)

# Цвета
$Cyan = "Cyan"
$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$White = "White"

Write-Host ""
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "  Автоматическая загрузка на GitHub" -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host ""

# Проверка Git
try {
    $gitVersion = git --version 2>&1
    Write-Host "[OK] Git найден: $gitVersion" -ForegroundColor $Green
} catch {
    Write-Host "[ERROR] Git не найден!" -ForegroundColor $Red
    Write-Host "Установите с https://git-scm.com/" -ForegroundColor $Yellow
    exit 1
}

# Переход в директорию проекта
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

Write-Host "[INFO] Путь: $projectPath" -ForegroundColor $Yellow
Write-Host ""

# Проверка наличия remote
$remoteUrl = git remote get-url origin 2>$null
if ([string]::IsNullOrWhiteSpace($remoteUrl)) {
    Write-Host "[ERROR] Remote 'origin' не настроен!" -ForegroundColor $Red
    Write-Host ""
    Write-Host "Настройте remote командой:" -ForegroundColor $Yellow
    Write-Host "  git remote add origin https://github.com/ВАШ_НИК/asopb-prototype.git" -ForegroundColor $White
    Write-Host ""
    pause
    exit 1
}

Write-Host "[OK] Remote: $remoteUrl" -ForegroundColor $Green
Write-Host ""

# Проверка статуса
Write-Host "📊 Проверка изменений..." -ForegroundColor $Cyan
$status = git status --porcelain

if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "[OK] Изменений нет" -ForegroundColor $Green
    Write-Host ""
    Write-Host "Нечего загружать. Файлы не изменялись." -ForegroundColor $Yellow
    exit 0
}

# Вывод изменений
Write-Host ""
Write-Host "📝 Найдены изменения:" -ForegroundColor $Cyan
git status --short
Write-Host ""

# Добавление файлов
Write-Host "➕ Добавление файлов..." -ForegroundColor $Cyan
git add .
Write-Host "[OK] Файлы добавлены" -ForegroundColor $Green
Write-Host ""

# Коммит
Write-Host "💾 Создание коммита..." -ForegroundColor $Cyan
Write-Host "   Сообщение: $message" -ForegroundColor $White
git commit -m $message

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Коммит создан" -ForegroundColor $Green
} else {
    Write-Host "[ERROR] Ошибка создания коммита" -ForegroundColor $Red
    Write-Host ""
    Write-Host "Возможно, нет изменений для коммита." -ForegroundColor $Yellow
    exit 1
}

# Push на GitHub
Write-Host ""
Write-Host "📤 Загрузка на GitHub..." -ForegroundColor $Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Green
    Write-Host "  Загрузка завершена успешно!" -ForegroundColor $Green
    Write-Host "========================================" -ForegroundColor $Green
    Write-Host ""
    
    # Извлечение имени репозитория
    $repoName = ($remoteUrl -split '/')[-1] -replace '.git$', ''
    $username = ($remoteUrl -split '/')[-2]
    
    Write-Host "📦 Репозиторий: $repoName" -ForegroundColor $Cyan
    Write-Host "👤 Пользователь: $username" -ForegroundColor $Cyan
    Write-Host ""
    Write-Host "🔗 Ссылка на репозиторий:" -ForegroundColor $Cyan
    Write-Host "   $remoteUrl" -ForegroundColor $White
    Write-Host ""
    Write-Host "🌐 GitHub Pages (если включён):" -ForegroundColor $Cyan
    Write-Host "   https://$username.github.io/$repoName/" -ForegroundColor $White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor $Red
    Write-Host "  Ошибка загрузки на GitHub!" -ForegroundColor $Red
    Write-Host "========================================" -ForegroundColor $Red
    Write-Host ""
    Write-Host "Возможные причины:" -ForegroundColor $Yellow
    Write-Host "  • Нет подключения к интернету" -ForegroundColor $White
    Write-Host "  • Неверные учётные данные" -ForegroundColor $White
    Write-Host "  • Нет прав доступа к репозиторию" -ForegroundColor $White
    Write-Host ""
    Write-Host "Попробуйте:" -ForegroundColor $Yellow
    Write-Host "  git push --set-upstream origin main" -ForegroundColor $White
    Write-Host ""
}
