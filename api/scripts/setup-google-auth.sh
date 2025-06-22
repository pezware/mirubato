#!/bin/bash

# Google OAuth Setup Script for Mirubato API
# This script helps you configure Google OAuth secrets in Cloudflare

set -e

echo "=== Mirubato API - Google OAuth Setup ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: wrangler CLI not found${NC}"
    echo "Please install wrangler: npm install -g wrangler"
    exit 1
fi

# Function to validate Google Client ID format
validate_client_id() {
    if [[ $1 =~ ^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$ ]]; then
        return 0
    else
        return 1
    fi
}

# Get current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
API_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "Working directory: $API_DIR"
echo

# Check environment
echo "Select environment:"
echo "1) Production (mirubato-api)"
echo "2) Staging (mirubato-api --env staging)"
read -p "Enter choice (1 or 2): " env_choice

case $env_choice in
    1)
        ENV_FLAG=""
        ENV_NAME="production"
        ;;
    2)
        ENV_FLAG="--env staging"
        ENV_NAME="staging"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo
echo -e "${YELLOW}Setting up Google OAuth for $ENV_NAME environment${NC}"
echo

# Get Google Client ID
echo "Enter your Google OAuth Client ID:"
echo "(Format: XXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com)"
read -p "Client ID: " CLIENT_ID

# Validate Client ID
if ! validate_client_id "$CLIENT_ID"; then
    echo -e "${RED}Error: Invalid Client ID format${NC}"
    echo "Expected format: XXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com"
    exit 1
fi

# Get Google Client Secret
echo
echo "Enter your Google OAuth Client Secret:"
echo "(This will be stored as an encrypted secret in Cloudflare)"
read -s -p "Client Secret: " CLIENT_SECRET
echo

# Confirm settings
echo
echo "=== Configuration Summary ==="
echo "Environment: $ENV_NAME"
echo "Client ID: $CLIENT_ID"
echo "Client Secret: [HIDDEN]"
echo
read -p "Proceed with setup? (y/N): " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
    echo "Setup cancelled"
    exit 0
fi

# Change to API directory
cd "$API_DIR"

# Set the client secret as an encrypted secret
echo
echo -e "${YELLOW}Setting encrypted secret...${NC}"
echo "$CLIENT_SECRET" | wrangler secret put GOOGLE_CLIENT_SECRET $ENV_FLAG

# Update wrangler.toml with the client ID
echo
echo -e "${YELLOW}Updating wrangler.toml...${NC}"

# Create backup
cp wrangler.toml wrangler.toml.backup

# Update the appropriate section based on environment
if [ "$ENV_NAME" = "production" ]; then
    # Update production vars
    sed -i.tmp 's/GOOGLE_CLIENT_ID = ".*"/GOOGLE_CLIENT_ID = "'$CLIENT_ID'"/' wrangler.toml
else
    # Update staging vars
    sed -i.tmp '/\[env.staging.vars\]/,/GOOGLE_CLIENT_ID = ".*"/ s/GOOGLE_CLIENT_ID = ".*"/GOOGLE_CLIENT_ID = "'$CLIENT_ID'"/' wrangler.toml
fi

# Clean up temp file
rm -f wrangler.toml.tmp

echo -e "${GREEN}✓ wrangler.toml updated${NC}"

# Show next steps
echo
echo "=== Next Steps ==="
echo
echo "1. Verify the changes in wrangler.toml:"
echo "   git diff wrangler.toml"
echo
echo "2. Deploy the changes:"
echo "   wrangler deploy $ENV_FLAG"
echo
echo "3. Test the OAuth flow:"
echo "   https://apiv2.mirubato.com/api/auth/google"
echo
echo "4. Don't forget to:"
echo "   - Add redirect URIs in Google Cloud Console"
echo "   - Update frontend with the same Client ID"
echo "   - Test the complete auth flow"
echo
echo -e "${GREEN}Setup complete!${NC}"

# Reminder about the backup
echo
echo -e "${YELLOW}Note: A backup of your wrangler.toml was created at wrangler.toml.backup${NC}"