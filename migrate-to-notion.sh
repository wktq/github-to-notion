#!/bin/bash

# GitHub to Notion Migration Script
# This script automates the process of migrating GitHub Projects to Notion

# Check if required environment variables are set
if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN environment variable is not set"
    echo "Please set it with: export GITHUB_TOKEN=your_github_token"
    exit 1
fi

if [ -z "$NOTION_TOKEN" ]; then
    echo "Error: NOTION_TOKEN environment variable is not set"
    echo "Please set it with: export NOTION_TOKEN=your_notion_integration_token"
    exit 1
fi

# Check if required arguments are provided
if [ $# -lt 4 ]; then
    echo "Usage: ./migrate-to-notion.sh <github-project-url> <notion-database-id> <status-field-name> <label-field-name> [imported-field-name]"
    echo ""
    echo "Example:"
    echo "  ./migrate-to-notion.sh https://github.com/orgs/myorg/projects/1 abc123def456 Status Labels Imported"
    echo ""
    echo "Arguments:"
    echo "  github-project-url  - URL of the GitHub project to export"
    echo "  notion-database-id  - ID of the Notion database to import into"
    echo "  status-field-name   - Name of the Notion field for GitHub project status"
    echo "  label-field-name    - Name of the Notion field for GitHub labels"
    echo "  imported-field-name - (Optional) Name of the Notion checkbox field to mark imported items"
    echo ""
    echo "To find your Notion database ID, run:"
    echo "  node list-notion-databases.js"
    exit 1
fi

GITHUB_URL=$1
NOTION_DB_ID=$2
STATUS_FIELD=$3
LABEL_FIELD=$4
IMPORTED_FIELD=$5

echo "GitHub to Notion Migration"
echo "========================="
echo "GitHub Project: $GITHUB_URL"
echo "Notion Database: $NOTION_DB_ID"
echo "Status Field: $STATUS_FIELD"
echo "Label Field: $LABEL_FIELD"
if [ -n "$IMPORTED_FIELD" ]; then
    echo "Imported Field: $IMPORTED_FIELD"
fi
echo ""

# Step 1: Export GitHub project data
echo "Step 1: Exporting GitHub project data..."
node dump-github-project.js "$GITHUB_URL" > project.json

if [ $? -ne 0 ]; then
    echo "Error: Failed to export GitHub project data"
    exit 1
fi

# Get project info from the exported data
PROJECT_TITLE=$(cat project.json | grep -m 1 '"title"' | cut -d'"' -f4)
ITEM_COUNT=$(cat project.json | grep -m 1 '"totalCount"' | sed 's/[^0-9]//g')

echo "✓ Exported project: $PROJECT_TITLE"
echo "✓ Total items: $ITEM_COUNT"
echo ""

# Step 2: Import to Notion
echo "Step 2: Importing to Notion..."
if [ -n "$IMPORTED_FIELD" ]; then
    node import-to-notion.js project.json "$NOTION_DB_ID" "$STATUS_FIELD" "$LABEL_FIELD" "$IMPORTED_FIELD"
else
    node import-to-notion.js project.json "$NOTION_DB_ID" "$STATUS_FIELD" "$LABEL_FIELD"
fi

if [ $? -ne 0 ]; then
    echo "Error: Failed to import to Notion"
    exit 1
fi

echo ""
echo "✓ Migration completed successfully!"
echo ""
echo "Next steps:"
echo "1. Check your Notion database to verify the imported data"
echo "2. The exported data is saved in project.json for reference"
echo "3. If you need to re-run the import, delete the imported pages in Notion first"