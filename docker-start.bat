@echo off
REM Docker startup script for EduMate (Windows)

setlocal enabledelayedexpansion

echo.
echo ========================================================
echo     EduMate - Docker Composition Startup Script
echo ========================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found
    if exist .env.docker.example (
        echo Creating .env from .env.docker.example...
        copy .env.docker.example .env
        echo [SUCCESS] Created .env file
        echo [WARNING] Please update .env with your configuration values
    ) else (
        echo [ERROR] .env.docker.example not found
        pause
        exit /b 1
    )
)

echo.
echo Building Docker images...
docker-compose build --no-cache
if errorlevel 1 (
    echo [ERROR] Failed to build Docker images
    pause
    exit /b 1
)

echo.
echo Starting all EduMate services...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Services started successfully!
echo.
echo Services Status:
docker-compose ps

echo.
echo ========================================================
echo                    Service URLs
echo ========================================================
echo Web App:              http://localhost:5173
echo Auth Service:         http://localhost:3001
echo Blockchain Service:   http://localhost:3003
echo Message Service:      http://localhost:3002
echo CV Parser Service:    http://localhost:5001
echo Ganache (RPC):        http://localhost:8545
echo Qdrant Vector DB:     http://localhost:6333
echo PostgreSQL:           localhost:5432
echo MongoDB:              localhost:27017
echo.

echo ========================================================
echo                  Useful Commands
echo ========================================================
echo View logs:            docker-compose logs -f
echo Stop services:        docker-compose down
echo Stop + remove data:   docker-compose down -v
echo View specific logs:   docker-compose logs -f [service-name]
echo Rebuild service:      docker-compose build --no-cache [service-name]
echo.

echo [SUCCESS] Start developing! 🚀
echo.
pause
