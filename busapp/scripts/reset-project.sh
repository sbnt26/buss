#!/bin/bash

echo "🔄 Kompletní reset projektu..."

# Odstranit všechny generated soubory
rm -rf node_modules
rm -rf .next
rm -f package-lock.json
rm -f tsconfig.tsbuildinfo

# Vyčistit npm cache
npm cache clean --force

echo "📦 Instaluji dependencies..."
npm install

echo "🔨 Build projekt..."
npm run build

echo "✅ Hotovo! Projekt je připraven k deployi."
echo ""
echo "Pro deploy na Railway:"
echo "1. git add ."
echo "2. git commit -m 'Fix npm build issues'"
echo "3. git push"
