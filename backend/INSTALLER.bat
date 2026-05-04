@echo off
echo.
echo ============================================
echo   ENCG Gestion Stages - Installation
echo ============================================
echo.

echo [1/6] Copie du fichier .env...
copy .env.example .env
echo.

echo [2/6] Installation des dependances Composer...
composer install --no-interaction
echo.

echo [3/6] Generation de la cle applicative...
php artisan key:generate
echo.

echo [4/6] Creation du lien de stockage...
php artisan storage:link
echo.

echo [5/6] Migration de la base de donnees...
echo Assurez-vous que XAMPP (Apache + MySQL) est demarre !
php artisan migrate
echo.

echo [6/6] Insertion des donnees de test...
php artisan db:seed
echo.

echo ============================================
echo   Installation terminee !
echo   Demarrer le serveur : php artisan serve
echo   API : http://localhost:8000/api
echo ============================================
pause
