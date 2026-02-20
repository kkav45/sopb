@echo off
chcp 65001 >nul
title АСОПБ - Первая настройка Git

echo ========================================
echo   Первая настройка Git для АСОПБ
echo ========================================
echo.

:: Проверка Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git не найден!
    echo.
    echo 1. Скачайте Git: https://git-scm.com/download/win
    echo 2. Установите с настройками по умолчанию
    echo 3. Запустите этот скрипт снова
    echo.
    pause
    exit /b 1
)

echo [OK] Git найден
echo.

:: Настройка пользователя
echo ========================================
echo   Настройка пользователя Git
echo ========================================
echo.

set /p name="Введите ваше имя для коммитов: "
if "%name%"=="" (
    echo [ERROR] Имя не может быть пустым
    pause
    exit /b 1
)

set /p email="Введите ваш email для GitHub: "
if "%email%"=="" (
    echo [ERROR] Email не может быть пустым
    pause
    exit /b 1
)

echo.
echo Сохранение настроек...
git config --global user.name "%name%"
git config --global user.email "%email%"

echo [OK] Настройки сохранены
echo.

:: Переход в директорию скрипта
cd /d "%~dp0"

:: Инициализация репозитория
echo ========================================
echo   Инициализация Git репозитория
echo ========================================
echo.

:: Проверка, не инициализирован ли уже
if exist ".git" (
    echo [INFO] Git уже инициализирован в этой папке
    echo.
) else (
    echo Инициализация...
    git init
    echo [OK] Репозиторий инициализирован
    echo.
)

:: Создание .gitignore
if exist ".gitignore" (
    echo [OK] .gitignore существует
) else (
    echo Создание .gitignore...
    (
        echo # System files
        echo Thumbs.db
        echo desktop.ini
        echo .DS_Store
        echo.
        echo # IDE
        echo .vscode/
        echo .idea/
        echo.
        echo # Secrets
        echo *.key
        echo *.secret
        echo *.token
        echo.
        echo # Node modules
        echo node_modules/
    ) > .gitignore
    echo [OK] .gitignore создан
)

echo.
echo ========================================
echo   Следующие шаги
echo ========================================
echo.
echo 1. Создайте репозиторий на GitHub:
echo    https://github.com/new
echo.
echo 2. Имя репозитория: asopb-prototype
echo.
echo 3. Выберите Private или Public
echo.
echo 4. НЕ нажимайте "Initialize with README"
echo.
echo 5. После создания выполните команды:
echo.
echo    git remote add origin https://github.com/ВАШ_НИК/asopb-prototype.git
echo    git branch -M main
echo    git add .
echo    git commit -m "Initial commit: ASOPB prototype"
echo    git push -u origin main
echo.
echo ========================================
echo.

pause
