#!/usr/bin/env node

import { Client } from '@notionhq/client'

if (process.argv.length < 3) {
  console.error('Usage: node create-notion-properties.js <database-id>')
  process.exit(1)
}

const token = process.env.NOTION_TOKEN

if (!token) {
  console.error('Missing NOTION_TOKEN in environment')
  process.exit(1)
}

const databaseId = process.argv[2]

const notion = new Client({
  auth: token
})

// Notion APIはデータベースのプロパティを更新する機能を提供しています
async function updateDatabaseProperties() {
  try {
    const response = await notion.databases.update({
      database_id: databaseId,
      properties: {
        "Status": {
          type: "select",
          select: {
            options: [
              { name: "Pendding", color: "gray" },
              { name: "✍️ 仕様作成中", color: "yellow" },
              { name: "👀 仕様レビュー中", color: "orange" },
              { name: "🎨 In Design - デザイン中", color: "pink" },
              { name: "🔖 Ready to Dev", color: "purple" },
              { name: "🚧 Dev WIP - 開発進行中", color: "blue" },
              { name: "👀 Dev Reviewing - コードレビュー中", color: "brown" },
              { name: "🧪 QA - リリース待ち", color: "red" },
              { name: "✅ Done - 本番リリース済み", color: "green" }
            ]
          }
        },
        "Priority": {
          type: "select", 
          select: {
            options: [
              { name: "🌋 Urgent", color: "red" },
              { name: "🏔 High", color: "orange" },
              { name: "🏕 Medium", color: "yellow" },
              { name: "🏝 Low", color: "green" }
            ]
          }
        },
        "Size": {
          type: "select",
          select: {
            options: [
              { name: "XS [- 1h]", color: "gray" },
              { name: "S [1h - 2h]", color: "blue" },
              { name: "M [2h - 5h]", color: "purple" },
              { name: "L [5h - 8h]", color: "pink" },
              { name: "XL [8h -]", color: "red" }
            ]
          }
        },
        "Assignees": {
          type: "people",
          people: {}
        },
        "リリース期日": {
          type: "date",
          date: {}
        },
        "デザイン期日": {
          type: "date", 
          date: {}
        },
        "Labels": {
          type: "multi_select",
          multi_select: {
            options: []
          }
        },
        "GitHub URL": {
          type: "url",
          url: {}
        },
        "作成日時": {
          type: "created_time",
          created_time: {}
        },
        "更新日時": {
          type: "last_edited_time",
          last_edited_time: {}
        }
      }
    })
    
    console.log('Database properties updated successfully!')
    console.log('Updated properties:')
    console.log('- Status (select)')
    console.log('- Priority (select)')
    console.log('- Size (select)')
    console.log('- Assignees (people)')
    console.log('- リリース期日 (date)')
    console.log('- デザイン期日 (date)')
    console.log('- Labels (multi_select)')
    console.log('- GitHub URL (url)')
    console.log('- 作成日時 (created_time)')
    console.log('- 更新日時 (last_edited_time)')
    
  } catch (error) {
    console.error('Error updating database properties:', error.message)
    if (error.body) {
      console.error('Error details:', JSON.stringify(error.body, null, 2))
    }
  }
}

updateDatabaseProperties()