#!/bin/bash

echo "🧹 Čištění npm cache a node_modules..."

# Odstranit package-lock.json a node_modules
rm -rf node_modules
rm -f package-lock.json

# Vyčistit npm cache
npm cache clean --force

# Znovu nainstalovat dependencies
echo "📦 Instaluji dependencies..."
npm install

echo "✅ Hotovo! Teď můžete deploynout na Railway."
echo "Spusťte: git add . && git commit -m 'Fix build issues' && git push"
