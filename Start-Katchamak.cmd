@echo off
cd /d "%~dp0"
if exist "src-tauri\target\project-files\release\katchamak.exe" (
  start "" "src-tauri\target\project-files\release\katchamak.exe"
) else (
  echo Run bun run desktop:build first.
  pause
)
