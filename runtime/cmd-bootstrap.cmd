@echo off
chcp 65001 >nul
set "AUTOCAPTURE_CWD="
set /p "AUTOCAPTURE_CWD="<"%AUTOCAPTURE_FOLDER%\cwd.txt"
cd /d "%AUTOCAPTURE_CWD%"
cls
set "AUTOCAPTURE_CWD="
@echo on
