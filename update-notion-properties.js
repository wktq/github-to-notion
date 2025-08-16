#!/usr/bin/env node

import { Client } from '@notionhq/client'

if (process.argv.length < 3) {
  console.error('Usage: node update-notion-properties.js <database-id>')
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

async function updateDatabaseProperties() {
  try {
    const response = await notion.databases.update({
      database_id: databaseId,
      properties: {
        "GitHub作成日": {
          type: "date",
          date: {}
        },
        "GitHub更新日": {
          type: "date",
          date: {}
        }
      }
    })
    
    console.log('Database properties updated successfully!')
    console.log('Added properties:')
    console.log('- GitHub作成日 (date)')
    console.log('- GitHub更新日 (date)')
    
  } catch (error) {
    console.error('Error updating database properties:', error.message)
    if (error.body) {
      console.error('Error details:', JSON.stringify(error.body, null, 2))
    }
  }
}

updateDatabaseProperties()