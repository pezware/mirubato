#!/bin/bash

# Service Template Setup Script
# This script helps set up a new service from the template

set -e

echo "🚀 Mirubato Service Setup"
echo "========================"
echo ""

# Get service name
read -p "Enter your service name (e.g., notifications): " SERVICE_NAME
if [ -z "$SERVICE_NAME" ]; then
    echo "❌ Service name is required"
    exit 1
fi

# Convert to lowercase and kebab-case
SERVICE_NAME_LOWER=$(echo "$SERVICE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
SERVICE_NAME_PASCAL=$(echo "$SERVICE_NAME" | sed 's/-/_/g' | sed 's/\b\(.\)/\u\1/g' | sed 's/_//g')

echo ""
echo "📝 Service Configuration:"
echo "  Name: $SERVICE_NAME_LOWER"
echo "  Worker: mirubato-$SERVICE_NAME_LOWER"
echo ""

# Update package.json
echo "📦 Updating package.json..."
sed -i.bak "s/@mirubato\/service-template/@mirubato\/$SERVICE_NAME_LOWER/g" package.json
sed -i.bak "s/Template for Mirubato microservices/$SERVICE_NAME_PASCAL service for Mirubato/g" package.json
rm package.json.bak

# Update wrangler.toml
echo "⚙️  Updating wrangler.toml..."
sed -i.bak "s/mirubato-template/mirubato-$SERVICE_NAME_LOWER/g" wrangler.toml
sed -i.bak "s/template\.mirubato\.com/$SERVICE_NAME_LOWER.mirubato.com/g" wrangler.toml
sed -i.bak "s/template-staging\.mirubato\.com/$SERVICE_NAME_LOWER-staging.mirubato.com/g" wrangler.toml
rm wrangler.toml.bak

# Update README
echo "📚 Updating README..."
sed -i.bak "s/service-template/$SERVICE_NAME_LOWER/g" README.md
sed -i.bak "s/my-new-service/$SERVICE_NAME_LOWER/g" README.md
sed -i.bak "s/Mirubato Service Template/$SERVICE_NAME_PASCAL Service/g" README.md
sed -i.bak "s/Mirubato Service API/$SERVICE_NAME_PASCAL API/g" README.md
rm README.md.bak

# Create KV namespaces
echo ""
echo "🗄️  Creating KV namespaces..."
echo "Run the following commands to create KV namespaces:"
echo ""
echo "  wrangler kv:namespace create \"${SERVICE_NAME_LOWER^^}_CACHE\""
echo "  wrangler kv:namespace create \"${SERVICE_NAME_LOWER^^}_CACHE\" --env staging"
echo "  wrangler kv:namespace create \"${SERVICE_NAME_LOWER^^}_CACHE\" --env development"
echo ""

# Create D1 databases
echo "💾 Creating D1 databases..."
echo "Run the following commands to create D1 databases:"
echo ""
echo "  wrangler d1 create mirubato-$SERVICE_NAME_LOWER-prod"
echo "  wrangler d1 create mirubato-$SERVICE_NAME_LOWER-staging"
echo "  wrangler d1 create mirubato-$SERVICE_NAME_LOWER-dev"
echo ""

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "🔐 Generated JWT secret (save this!):"
echo "  $JWT_SECRET"
echo ""
echo "Set this secret in all environments:"
echo "  wrangler secret put JWT_SECRET --env production"
echo "  wrangler secret put JWT_SECRET --env staging"
echo "  wrangler secret put JWT_SECRET --env development"
echo ""

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Initialize git
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for $SERVICE_NAME_LOWER service"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update the KV namespace IDs in wrangler.toml"
echo "2. Update the D1 database IDs in wrangler.toml"
echo "3. Set the JWT_SECRET in all environments"
echo "4. Update the service routes and business logic"
echo "5. Run 'npm run dev' to start developing"
echo ""
echo "Happy coding! 🎉"