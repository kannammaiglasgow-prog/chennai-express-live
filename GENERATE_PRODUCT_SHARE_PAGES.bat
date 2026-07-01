@echo off
cd /d "%~dp0"
node generate-product-pages.mjs
echo.
echo Product share pages have been updated.
pause
