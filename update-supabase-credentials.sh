#!/bin/bash
# Helper script to update Supabase credentials

echo "🔧 Supabase Credentials Setup"
echo "=============================="
echo ""

read -p "Enter your new Supabase URL: " SUPABASE_URL
read -p "Enter your new Supabase Anon Key: " SUPABASE_ANON_KEY

# Update .env.local
cat > .env.local << EOL
# Supabase Configuration
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Gemini API Key for AI features (optional)
VITE_GEMINI_API_KEY=AIzaSyBt7PYiYMkx-myuW0dsQbXmIq7JIjrMKhA
EOL

echo ""
echo "✅ Credentials updated in .env.local"
echo ""
echo "📝 Next steps:"
echo "1. Restart your dev server: npm run dev"
echo "2. Go to http://localhost:3000"
echo "3. Try signing up!"
echo ""
