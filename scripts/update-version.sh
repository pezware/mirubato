#!/bin/bash

# Mirubato Version Update Script
# Usage: ./scripts/update-version.sh <new-version>
# Example: ./scripts/update-version.sh 1.7.7

set -e

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "Error: Please provide a version number"
    echo "Usage: $0 <new-version>"
    echo "Example: $0 1.7.7"
    exit 1
fi

NEW_VERSION=$1

# Validate version format (basic semver check)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid version format. Please use semantic versioning (e.g., 1.7.7)"
    exit 1
fi

echo "Updating Mirubato to version $NEW_VERSION..."

# Update central version.json
echo "Updating version.json..."
cat > version.json << EOF
{
  "version": "$NEW_VERSION"
}
EOF

# Update all package.json files
echo "Updating package.json files..."
for package_file in package.json \
                   frontendv2/package.json \
                   api/package.json \
                   scores/package.json \
                   dictionary/package.json \
                   sync-worker/package.json \
                   service-template/package.json; do
    if [ -f "$package_file" ]; then
        echo "  - $package_file"
        # Use sed to update version field
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$package_file"
        else
            # Linux
            sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$package_file"
        fi
    else
        echo "  - $package_file (not found, skipping)"
    fi
done

echo ""
echo "✅ Version updated to $NEW_VERSION"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff"
echo "2. Update CLAUDE.md version history section manually"
echo "3. Commit the changes: git add -A && git commit -m \"chore: bump version to $NEW_VERSION\""
echo "4. Create a git tag: git tag v$NEW_VERSION"
echo "5. Push to remote: git push && git push --tags"