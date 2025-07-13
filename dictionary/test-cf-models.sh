#\!/bin/bash

# Test available Cloudflare AI models
echo "Testing Cloudflare AI Models..."
echo "================================"

# Models to test based on Cloudflare docs
models=(
  "@cf/meta/llama-3.1-8b-instruct"
  "@cf/meta/llama-3.1-70b-instruct"
  "@cf/meta/llama-3-8b-instruct"
  "@cf/meta/llama-2-7b-chat-int8"
  "@cf/mistral/mistral-7b-instruct-v0.1"
  "@cf/mistral/mistral-7b-instruct"
  "@hf/thebloke/llama-2-13b-chat-awq"
  "@hf/thebloke/codellama-7b-instruct-awq"
  "@hf/thebloke/deepseek-coder-6.7b-instruct-awq"
)

for model in "${models[@]}"; do
  echo -n "Testing $model... "
  response=$(curl -s -w "\n%{http_code}" "https://dictionary.mirubato.com/api/v1/test-model?model=$(echo $model  < /dev/null |  sed 's/@/%40/g' | sed 's/\//%2F/g')")
  http_code=$(echo "$response" | tail -n 1)
  if [ "$http_code" = "200" ]; then
    echo "✓ Available"
  else
    echo "✗ Not available (HTTP $http_code)"
  fi
done
