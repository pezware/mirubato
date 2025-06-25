#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🚀 Running comprehensive validation..."

# Track overall status
FAILED=0

# Function to run a command and check its status
run_check() {
  local description=$1
  local command=$2
  local continue_on_error=${3:-false}
  
  echo -e "\n${YELLOW}🔍 ${description}...${NC}"
  eval $command
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ ${description} failed${NC}"
    if [ "$continue_on_error" = "false" ]; then
      FAILED=1
    fi
  else
    echo -e "${GREEN}✅ ${description} passed${NC}"
  fi
}

# Lint checks
run_check "ESLint for all workspaces" "npm run lint"

# Type checks
run_check "TypeScript type checking" "npm run type-check"

# Unit tests
run_check "Unit tests for all workspaces" "npm run test:unit -- --passWithNoTests"

# GraphQL schema check
run_check "GraphQL schema alignment" "npm run codegen:check"

# Build checks
run_check "Build all workspaces" "npm run build:frontend && npm run build:backend"

# Check for security vulnerabilities
run_check "Security audit" "npm audit --audit-level=high"

# Check for unused dependencies
echo -e "\n${YELLOW}🔍 Checking for unused dependencies...${NC}"
npx depcheck --ignore-patterns=dist,coverage,build

# Summary
echo -e "\n${YELLOW}=====================================>${NC}"
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All validation checks passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some validation checks failed. Please fix the issues before committing.${NC}"
  exit 1
fi