@echo off
title NEXAA - Servidores de Desarrollo
setlocal enabledelayedexpansion

echo ===================================================================
echo   NEXAA - Iniciando Plataforma de Noticias Regionales (Nuble)
echo ===================================================================
echo.

:: Detectar la IP local de red para facilitar la prueba en dispositivos moviles
set "localip=localhost"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "tempip=%%a"
    :: Eliminar el espacio inicial
    set "tempip=!tempip:~1!"
    :: Buscar rangos de red local comunes (192.168.x.x, 10.x.x.x, 172.16.x.x)
    if "!tempip:~0,3!"=="192" set "localip=!tempip!"
    if "!tempip:~0,3!"=="10." set "localip=!tempip!"
    if "!tempip:~0,3!"=="172" set "localip=!tempip!"
)

echo [+] Iniciando Servidor Backend (API Express) en http://localhost:3001...
start "NEXAA Backend API" cmd /c "npm run backend"
timeout /t 2 /nobreak >nul

echo.
echo [+] Iniciando Servidor Frontend (Next.js 14) en http://localhost:3000...
start "NEXAA Frontend Web" cmd /c "npm run dev"
echo.

echo ===================================================================
echo   [OK] Servidores iniciados con exito.
echo.
echo   [-] Acceso en esta Computadora (PC):
echo       - Web Frontend:  http://localhost:3000
echo       - Backend API:   http://localhost:3001
echo.
echo   [-] Acceso en Red Local (Telefono Movil / Tablet):
if "!localip!"=="localhost" (
    echo       - Para ver en el movil, conecta el celular al mismo Wi-Fi
    echo         y busca la IP de tu computadora con el comando 'ipconfig'.
    echo         La direccion sera: http://[tu-ip-local]:3000
) else (
    echo       - Web Frontend:  http://!localip!:3000
    echo       - Backend API:   http://!localip!:3001
    echo.
    echo       * Asegurate de conectar tu celular al MISMO Wi-Fi que la PC.
)
echo ===================================================================
echo.
echo Puedes cerrar esta ventana. Las otras terminales seguiran corriendo en segundo plano.
timeout /t 10 >nul
exit
