import { getProductionDeployedUrl } from './saas-pricing';

/**
 * Utilities to generate and download client-specific desktop launchers and shortcuts
 */

export function getCleanAppUrl(path: string = ''): string {
  const base = getProductionDeployedUrl();
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${base}${cleanPath}`;
}

/**
 * Generates and downloads a native Windows Batch Launcher (.bat)
 * This script searches for MS Edge, Google Chrome, or Brave on the user's PC and launches the app
 * in a borderless, dedicated application window (--app mode) directly connecting to /admin or root POS.
 */
export function downloadWindowsBatchLauncher(isAdmin: boolean = false) {
  const targetPath = isAdmin ? 'admin' : '';
  const appUrl = getCleanAppUrl(targetPath);
  const appTitle = isAdmin ? 'Teki Pharm - Executive Admin Gateway' : 'Teki Pharm - Standalone POS Terminal';
  const fileName = isAdmin ? 'Teki-Pharm-Executive-Admin-Launcher.bat' : 'Teki-Pharm-POS-Windows-Launcher.bat';

  const scriptContent = `@echo off
:: =========================================================================
:: ${appTitle}
:: Standalone Secure Window Launcher - URL: ${appUrl}
:: =========================================================================
title Launching ${appTitle}...

set APP_URL=${appUrl}

:: 1. Check for Microsoft Edge (Pre-installed on all Windows 10 & 11 PCs)
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%APP_URL%" --enable-features=OverlayScrollbar
    exit /b
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%APP_URL%" --enable-features=OverlayScrollbar
    exit /b
)

:: 2. Check for Google Chrome
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%APP_URL%"
    exit /b
)
if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" --app="%APP_URL%"
    exit /b
)
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --app="%APP_URL%"
    exit /b
)

:: 3. Check for Brave
if exist "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" (
    start "" "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe" --app="%APP_URL%"
    exit /b
)

:: 4. Fallback to default browser
start "" "%APP_URL%"
exit /b
`;

  const blob = new Blob([scriptContent], { type: 'application/x-bat;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a Windows Internet Shortcut (.url)
 * When placed on the Desktop or pinned to Taskbar, double clicking opens the target application at /admin or /.
 */
export function downloadWindowsShortcut(isAdmin: boolean = false) {
  const targetPath = isAdmin ? 'admin' : '';
  const appUrl = getCleanAppUrl(targetPath);
  const fileName = isAdmin ? 'Teki Pharm Executive Admin.url' : 'Teki Pharm POS.url';

  const shortcutContent = `[InternetShortcut]
URL=${appUrl}
IconIndex=0
IconFile=${getCleanAppUrl('')}/favicon.png
HotKey=0
IDList=
`;

  const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

