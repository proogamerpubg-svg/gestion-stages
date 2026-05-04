#!/bin/bash

# ============================================================
# Script d'installation backend Laravel — ENCG Gestion Stages
# ============================================================

echo ""
echo "=============================================="
echo "  ENCG Gestion Stages — Installation Backend"
echo "=============================================="
echo ""

# Vérifier PHP
if ! command -v php &> /dev/null; then
    echo "❌ PHP non trouvé. Installez XAMPP et ajoutez PHP au PATH."
    exit 1
fi

PHP_VERSION=$(php -r "echo PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION;")
echo "✅ PHP $PHP_VERSION détecté"

# Vérifier Composer
if ! command -v composer &> /dev/null; then
    echo "❌ Composer non trouvé. Téléchargez depuis https://getcomposer.org"
    exit 1
fi
echo "✅ Composer détecté"

# 1. Copier .env
echo ""
echo "📋 Configuration de l'environnement..."
cp .env.example .env

# 2. Installer les dépendances
echo ""
echo "📦 Installation des dépendances Composer..."
composer install --no-interaction --prefer-dist

# 3. Générer la clé d'application
echo ""
echo "🔑 Génération de la clé applicative..."
php artisan key:generate

# 4. Créer le lien storage
echo ""
echo "🔗 Création du lien de stockage public..."
php artisan storage:link

# 5. Créer les dossiers de stockage
echo ""
echo "📁 Création des dossiers de stockage..."
mkdir -p storage/app/public/documents
mkdir -p storage/app/public/modeles
mkdir -p storage/app/public/archives

# 6. Migrations
echo ""
echo "🗄️  Exécution des migrations..."
php artisan migrate --force

# 7. Seeders
echo ""
echo "🌱 Insertion des données de test..."
php artisan db:seed --force

echo ""
echo "=============================================="
echo "  ✅ Installation terminée avec succès !"
echo "=============================================="
echo ""
echo "  Démarrer le serveur :"
echo "  php artisan serve --port=8000"
echo ""
echo "  API disponible sur : http://localhost:8000/api"
echo ""
