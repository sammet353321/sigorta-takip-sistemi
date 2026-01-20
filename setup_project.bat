@echo off
setlocal
title Sigorta Acentesi - Proje Yonetim Araci

:menu
cls
echo ========================================================
echo   SIGORTA ACENTESI - PROJE YONETIM VE KURULUM ARACI
echo ========================================================
echo.
echo [SISTEM KONTROLU]
call :check_requirements
echo.
echo [ISLEMLER]
echo 1. Kurulumu Baslat (Bagimliliklari Yukle)
echo 2. Temiz Kurulum Yap (Eski dosyalari sil ve yeniden yukle)
echo 3. Uygulamayi Baslat (Frontend + Backend)
echo 4. Sadece Backend'i Baslat (WhatsApp Servisi)
echo 5. Cikis
echo.
set /p choice="Seciminiz (1-5): "

if "%choice%"=="1" goto install
if "%choice%"=="2" goto clean_install
if "%choice%"=="3" goto start_app
if "%choice%"=="4" goto start_backend
if "%choice%"=="5" exit
goto menu

:check_requirements
echo.
echo Kontrol ediliyor...
:: Node.js Kontrolu
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js BULUNAMADI! Lutfen https://nodejs.org adresinden yukleyin.
) else (
    echo [OK] Node.js yuklu.
)

:: Git Kontrolu
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Git BULUNAMADI! Lutfen https://git-scm.com adresinden yukleyin.
) else (
    echo [OK] Git yuklu.
)
exit /b 0

:install
echo.
echo [1/2] Frontend bagimliliklari yukleniyor...
call npm install
if %errorlevel% neq 0 (
    echo [HATA] Frontend kurulumunda hata olustu.
    pause
    goto menu
)

echo.
echo [2/2] Backend bagimliliklari yukleniyor...
cd whatsapp-backend
call npm install
if %errorlevel% neq 0 (
    echo [HATA] Backend kurulumunda hata olustu.
    cd ..
    pause
    goto menu
)
cd ..
echo.
echo Kurulum basariyla tamamlandi!
pause
goto menu

:clean_install
echo.
echo DIKKAT: node_modules klasorleri silinecek ve bastan kurulacak.
echo Bu islem internet hizina bagli olarak zaman alabilir.
set /p confirm="Devam etmek istiyor musunuz? (E/H): "
if /i "%confirm%" neq "E" goto menu

echo.
echo [1/4] Frontend node_modules siliniyor...
if exist node_modules (
    rmdir /s /q node_modules
    echo Silindi.
)

echo.
echo [2/4] Backend node_modules siliniyor...
if exist whatsapp-backend\node_modules (
    rmdir /s /q whatsapp-backend\node_modules
    echo Silindi.
)

echo.
echo [3/4] Frontend yeniden kuruluyor...
call npm install

echo.
echo [4/4] Backend yeniden kuruluyor...
cd whatsapp-backend
call npm install
cd ..

echo.
echo Temiz kurulum tamamlandi!
pause
goto menu

:start_app
echo.
echo Uygulama baslatiliyor...
echo.
echo 1. Terminal: Frontend (React)
echo 2. Terminal: Backend (WhatsApp Servisi)
echo.
start "Frontend - Sigorta Paneli" cmd /k "npm run dev"
start "Backend - WhatsApp Servisi" cmd /k "cd whatsapp-backend && npm start"
echo Baslatildi. Pencereleri kapatarak durdurabilirsiniz.
pause
goto menu

:start_backend
echo.
echo Sadece Backend baslatiliyor...
cd whatsapp-backend
npm start
cd ..
pause
goto menu
