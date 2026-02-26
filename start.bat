@echo off
echo.
echo ========================================
echo     GreenPulse v2.0 — Starting
echo ========================================
echo.

echo [1/3] Starting Pathway pipeline in Docker...
docker compose -f docker-compose.pathway.yml up -d --build
if %ERRORLEVEL% NEQ 0 (
    echo [!] Docker unavailable — using simulate_pipeline.py fallback
    start "Simulator" cmd /k "cd /d %~dp0 && python simulate_pipeline.py"
) else (
    echo [OK] Pathway running in Docker (writing to .\tmp\)
)

echo.
echo [2/3] Starting FastAPI server...
start "FastAPI" cmd /k "cd /d %~dp0 && python -m uvicorn rag.api_server:app --port 8000 --reload"

echo.
echo [3/3] Starting Next.js dashboard...
start "NextJS" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo ========================================
echo   Dashboard: http://localhost:3000
echo   API:       http://localhost:8000
echo   Pathway:   docker logs greenpulse-pathway-1 -f
echo ========================================
echo.
echo Press any key to close this launcher...
pause >nul
