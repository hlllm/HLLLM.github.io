@echo off
chcp 65001 >nul
echo 正在启动商品管理系统...
echo 首次运行会自动安装依赖...
echo.
if not exist node_modules npm install
echo.
node server.js
pause