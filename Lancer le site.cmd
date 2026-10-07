@echo off
rem ==========================================================================
rem  Theatre d'ombre augmente : lance le site sur cet ordinateur.
rem  Double-cliquer sur ce fichier, puis laisser cette fenetre ouverte.
rem  Pour arreter le site : fermer cette fenetre.
rem ==========================================================================
cd /d "%~dp0"
title Theatre d'ombre - site local (ne pas fermer pendant l'utilisation)

rem Node.js : celui du PATH, sinon celui installe avec winget.
set "NODE=node"
where node >nul 2>nul
if errorlevel 1 set "NODE=%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.19.0-win-x64\node.exe"

echo.
echo   Le site demarre... le navigateur va s'ouvrir sur http://localhost:8080
echo   Laissez cette fenetre ouverte. Pour arreter : fermez-la.
echo.

rem Ouvre le navigateur 2 secondes apres le demarrage du serveur.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080"
"%NODE%" tools\serve.mjs
echo.
echo   Le serveur s'est arrete (voir le message ci-dessus).
pause
