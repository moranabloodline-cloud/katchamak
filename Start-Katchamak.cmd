@echo off
cd /d "%~dp0"
if exist "src-tauri\target\release\katchamak.exe" (
  start "" "src-tauri\target\release\katchamak.exe"
) else (
  echo Run bun run desktop:build first.
  pause
)
