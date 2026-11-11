@echo off
cd /d "%~dp0"
if exist ".tools\bun.exe" (
  .tools\bun.exe run desktop:dev
) else (
  bun run desktop:dev
)
pause
