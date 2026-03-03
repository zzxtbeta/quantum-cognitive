@echo off
echo ========================================
echo 量子引擎 - 认知投资系统
echo ========================================
echo.

echo 检查 Node.js 安装...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js 版本:
node --version
echo.

echo 检查依赖安装...
if not exist "node_modules\" (
    echo 首次运行，正在安装依赖...
    echo 这可能需要几分钟时间，请耐心等待...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
    echo.
    echo 依赖安装完成！
    echo.
)

echo 启动开发服务器...
echo 服务器将在 http://localhost:3000 启动
echo 按 Ctrl+C 可停止服务器
echo.
echo ========================================
echo.

call npm run dev
