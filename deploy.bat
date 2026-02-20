@echo off
chcp 65001 >nul
title АСОПБ - Загрузка на GitHub

echo ========================================
echo   Автоматическая загрузка на GitHub
echo ========================================
echo.

:: Проверка Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git не найден!
    echo.
    echo Установите Git с https://git-scm.com/
    echo.
    pause
    exit /b 1
)

echo [OK] Git найден
echo.

:: Переход в директорию скрипта
cd /d "%~dp0"

:: Проверка remote
git remote get-url origin >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Remote 'origin' не настроен!
    echo.
    echo Настройте командой:
    echo   git remote add origin https://github.com/ВАШ_НИК/asopb-prototype.git
    echo.
    pause
    exit /b 1
)

:: Статус
echo Проверка изменений...
git status --short
echo.

:: Проверка на изменения
git diff-index --quiet HEAD --
if %errorlevel% equ 0 (
    echo [OK] Изменений нет
    echo.
    echo Нечего загружать.
    pause
    exit /b 0
)

:: Добавление
echo Добавление файлов...
git add .
echo [OK] Файлы добавлены
echo.

:: Сообщение коммита
set /p message="Введите сообщение (или Enter для авто): "
if "%message%"=="" set message=Auto commit %date% %time%

:: Коммит
echo Коммит: %message%
git commit -m "%message%"

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Нет изменений для коммита
    pause
    exit /b 0
)

echo [OK] Коммит создан
echo.

:: Push
echo Загрузка на GitHub...
git push

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   [SUCCESS] Загрузка завершена!
    echo ========================================
    echo.
    
    :: Получение URL репозитория
    for /f "delims=" %%i in ('git remote get-url origin') do set repoUrl=%%i
    
    echo Репозиторий: %repoUrl%
    echo.
) else (
    echo.
    echo ========================================
    echo   [ERROR] Ошибка загрузки!
    echo ========================================
    echo.
    echo Проверьте:
    echo   - Подключение к интернету
    echo   - Права доступа к репозиторию
    echo   - Учётные данные GitHub
    echo.
)

pause
