@echo off
REM Script to run database migration on Windows
REM Usage: scripts\run-migration.bat

echo =========================================
echo Running Database Migration
echo =========================================
echo.

REM Check if psql is available
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: psql command not found
    echo Please install PostgreSQL client
    exit /b 1
)

REM Load DATABASE_URL from .env
if not exist .env (
    echo Error: .env file not found
    exit /b 1
)

REM Read DATABASE_URL from .env (simple approach)
for /f "tokens=1,2 delims==" %%a in ('findstr /r "^DATABASE_URL=" .env') do set DATABASE_URL=%%b

echo Database URL: %DATABASE_URL%
echo.

echo Running migration: migrations\sync-with-new-schema.sql
echo.

psql "%DATABASE_URL%" -f migrations\sync-with-new-schema.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Migration completed successfully!
    echo.
    echo Next steps:
    echo   1. Restart your NestJS server
    echo   2. Test the new APIs using Swagger: http://localhost:3001/api-docs
    echo   3. Check the test script: npm run test:apis
) else (
    echo.
    echo Migration failed!
    echo Please check the error messages above.
    exit /b 1
)
