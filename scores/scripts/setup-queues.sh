#!/bin/bash

# Script to create necessary queues for PDF processing
# Run this before deploying to a new environment

echo "🚀 Setting up Cloudflare Queues for PDF processing..."

# Function to create queue if it doesn't exist
create_queue() {
    local queue_name=$1
    echo "Creating queue: $queue_name"
    
    # Check if queue exists
    if wrangler queues list | grep -q "$queue_name"; then
        echo "✅ Queue $queue_name already exists"
    else
        wrangler queues create "$queue_name"
        echo "✅ Created queue: $queue_name"
    fi
}

# Production queues
echo ""
echo "📦 Setting up Production queues..."
create_queue "pdf-processing"
create_queue "pdf-processing-dlq"

# Staging queues
echo ""
echo "🧪 Setting up Staging queues..."
create_queue "pdf-processing-staging"
create_queue "pdf-processing-staging-dlq"

# Development queues
echo ""
echo "🔧 Setting up Development queues..."
create_queue "pdf-processing-dev"
create_queue "pdf-processing-dev-dlq"

echo ""
echo "✨ Queue setup complete!"
echo ""
echo "Note: You may need to manually configure dead letter queue settings in the Cloudflare dashboard."