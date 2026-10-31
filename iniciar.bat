@echo off
setlocal
cd /d "%~dp0"
title JARVES AI - Inicializador
if not exist .env copy .env.example .env >nul
where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao foi encontrado.
  echo Instale Node.js 18 ou superior e execute iniciar.bat novamente.
  pause
  exit /b 1
)
rem localhost pode resolver para ::1 no Firefox; :: aceita IPv6 e IPv4.
set HOST=::
echo Iniciando servidor JARVES...
start "JARVES Gateway" /min cmd /c "cd /d ""%~dp0"" && set HOST=:: && node server.js"
set "READY="
for /l %%i in (1,1,30) do (
  powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 http://localhost:3000/v1/health; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>nul
  if not errorlevel 1 (set "READY=1" & goto :ready)
  timeout /t 1 /nobreak >nul
)
echo.
echo ERRO: o servidor nao respondeu em http://localhost:3000.
echo Verifique se a porta 3000 esta ocupada ou se o Node.js foi bloqueado.
echo Tente executar "node server.js" nesta pasta para ver o erro detalhado.
pause
exit /b 1
:ready
echo Servidor JARVES conectado!
start "" http://localhost:3000
echo JARVES esta aberto. Esta janela pode ser fechada.
endlocal
