#!/bin/bash
# Fix local database migration conflicts
# This script marks conflicting migrations as already applied

echo "🔧 Fixing local database migration conflicts..."

# Create temporary SQL file
cat > /tmp/fix_local_migrations.sql << 'EOF'
-- Mark conflicting migrations as already applied
INSERT INTO d1_migrations (name, applied_at) 
VALUES 
  ('0002_add_slug_pdf_url.sql', datetime('now')),
  ('0003_add_import_columns.sql', datetime('now')),
  ('0005_initial_data.sql', datetime('now'))
ON CONFLICT(name) DO NOTHING;
EOF

# Apply the fixes
wrangler d1 execute DB --local --file /tmp/fix_local_migrations.sql

# Clean up
rm /tmp/fix_local_migrations.sql

echo "✅ Migration conflicts fixed!"
echo ""
echo "Now run: npm run db:migrate"