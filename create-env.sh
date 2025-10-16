#!/bin/bash
# Vytvoří .env.local s Railway credentials

echo "📝 Vytvářím .env.local s Railway credentials..."

railway run bash -c 'cat > .env.local << EOL
# Local development with Railway database
DATABASE_URL=$DATABASE_URL
SESSION_SECRET=$(openssl rand -base64 48)
JWT_EXPIRES_IN=7d
NODE_ENV=development
GOTENBERG_URL=http://localhost:3001
UPLOAD_DIR=./uploads/invoices
EOL
echo "✅ .env.local vytvořen!"
cat .env.local
'
