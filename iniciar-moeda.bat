@echo off
setlocal
cd /d "%~dp0"
echo Enderecos IPv4 deste computador:
ipconfig | findstr /i "IPv4"
echo No celular, use http://ENDERECO-IP-DO-PC:8000 na mesma rede Wi-Fi.
echo Se o Windows perguntar, permita acesso em rede privada.
start "Servidor local do Moeda" py -m http.server 8000 --bind 0.0.0.0
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:8000
