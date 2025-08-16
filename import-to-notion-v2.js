#!/usr/bin/env node

import fs from 'node:fs/promises'
import { Client } from '@notionhq/client'
import { markdownToBlocks } from '@tryfabric/martian'

if (process.argv.length < 3) {
  console.error('Usage: node import-to-notion-v2.js <project-file> <database-id> [--clear]')
  process.exit(1)
}

const token = process.env.NOTION_TOKEN

if (!token) {
  console.error('Missing NOTION_TOKEN in environment')
  process.exit(1)
}

const projectFile = process.argv[2]
const databaseId = process.argv[3]
const shouldClear = process.argv.includes('--clear')
const project = JSON.parse(await fs.readFile(projectFile))

const notion = new Client({
  auth: token
})

const schema = await notion.databases.retrieve({
  database_id: databaseId
})

function getMarkdown (content) {
  if (!content) return ''
  
  let markdown = ''
  
  // Add URL if available
  if (content.url) {
    markdown = content.url + '\n\n'
  }
  
  // Add body content
  if (content.body) {
    markdown += content.body
  }
  
  // Add comments
  if (content.comments && content.comments.nodes) {
    for (const comment of content.comments.nodes) {
      markdown += '\n\n---\n\n'
      if (comment.author && comment.author.login) {
        markdown += `**@${comment.author.login}** commented:\n\n`
      }
      markdown += comment.body || ''
    }
  }

  return markdown
}

function getFieldValue(fieldValues, fieldName) {
  if (!fieldValues || !fieldValues.nodes) return null
  
  for (const fieldValue of fieldValues.nodes) {
    if (fieldValue.field && fieldValue.field.name === fieldName) {
      return fieldValue
    }
  }
  
  return null
}

async function createPageWithRetry(payload, title, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Notion APIでは作成日時を直接設定できないため、作成後に更新する必要がある
      const createdPage = await notion.pages.create(payload)
      console.log(`Created page: ${title}`)
      return createdPage
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Failed to create page "${title}" after ${maxRetries} attempts: ${error.message}`)
        if (error.body) {
          console.error('Error details:', JSON.stringify(error.body, null, 2))
        }
        return null
      } else {
        console.warn(`Attempt ${attempt} failed for "${title}", retrying...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Exponential backoff
      }
    }
  }
}

async function createPage (item) {
  // Get title from content or use a default
  let title = 'Untitled'
  if (item.content) {
    title = item.content.title || `${item.content.__typename} #${item.content.number}` || 'Untitled'
  }
  
  const payload = {
    parent: {
      database_id: databaseId
    },
    properties: {}
  }
  
  // Find the title property (it might be named differently)
  const titleProperty = Object.entries(schema.properties).find(([_, prop]) => prop.type === 'title')
  if (titleProperty) {
    payload.properties[titleProperty[0]] = {
      title: [
        {
          text: {
            content: title.substring(0, 2000) // Notion has a limit on title length
          }
        }
      ]
    }
  }
  
  // Add Status field
  const statusValue = getFieldValue(item.fieldValues, 'Status')
  if (statusValue && statusValue.name && schema.properties['Status']) {
    payload.properties['Status'] = {
      select: { name: statusValue.name }
    }
  }
  
  // Add Priority field
  const priorityValue = getFieldValue(item.fieldValues, 'Priority')
  if (priorityValue && priorityValue.name && schema.properties['Priority']) {
    payload.properties['Priority'] = {
      select: { name: priorityValue.name }
    }
  }
  
  // Add Size field
  const sizeValue = getFieldValue(item.fieldValues, 'Size')
  if (sizeValue && sizeValue.name && schema.properties['Size']) {
    payload.properties['Size'] = {
      select: { name: sizeValue.name }
    }
  }
  
  // Add リリース期日 (Release Date)
  const releaseDate = getFieldValue(item.fieldValues, 'リリース期日')
  if (releaseDate && releaseDate.title && schema.properties['リリース期日']) {
    // Extract date from iteration title (e.g., "2024-10-01 - 2024-10-31")
    const dateMatch = releaseDate.title.match(/(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      payload.properties['リリース期日'] = {
        date: { start: dateMatch[1] }
      }
    }
  }
  
  // Add デザイン期日 (Design Date)
  const designDate = getFieldValue(item.fieldValues, 'デザイン期日')
  if (designDate && designDate.title && schema.properties['デザイン期日']) {
    const dateMatch = designDate.title.match(/(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      payload.properties['デザイン期日'] = {
        date: { start: dateMatch[1] }
      }
    }
  }
  
  // Add GitHub URL
  if (item.content && item.content.url && schema.properties['GitHub URL']) {
    payload.properties['GitHub URL'] = {
      url: item.content.url
    }
  }
  
  // Add Labels
  if (item.content && item.content.labels && item.content.labels.nodes && item.content.labels.nodes.length > 0 && schema.properties['Labels']) {
    payload.properties['Labels'] = {
      multi_select: item.content.labels.nodes.map(label => ({ name: label.name }))
    }
  }
  
  // Add created/updated dates as custom fields
  if (item.createdAt && schema.properties['GitHub作成日']) {
    payload.properties['GitHub作成日'] = {
      date: { start: item.createdAt.split('T')[0] } // Use only date part
    }
  }
  
  if (item.updatedAt && schema.properties['GitHub更新日']) {
    payload.properties['GitHub更新日'] = {
      date: { start: item.updatedAt.split('T')[0] } // Use only date part
    }
  }
  
  // Process content to blocks
  if (item.content) {
    const markdown = getMarkdown(item.content)
    if (markdown) {
      try {
        const blocks = markdownToBlocks(markdown)
        // Limit blocks to avoid validation errors
        if (blocks.length > 100) {
          console.warn(`Content too long for "${title}", truncating to 100 blocks`)
          blocks.length = 100
        }
        payload.children = blocks
      } catch (e) {
        console.warn(`Could not convert markdown to blocks for "${title}": ${e.message}`)
        // Fallback to simple paragraph block
        payload.children = [{
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{
              type: 'text',
              text: { content: markdown.substring(0, 2000) }
            }]
          }
        }]
      }
    }
  }

  return createPageWithRetry(payload, title)
}

// Clear existing pages if requested
if (shouldClear) {
  console.log('Clearing existing pages...')
  let hasMore = true
  let startCursor = undefined
  let clearedCount = 0
  
  while (hasMore) {
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
      start_cursor: startCursor
    })
    
    for (const page of response.results) {
      try {
        await notion.pages.update({
          page_id: page.id,
          archived: true
        })
        clearedCount++
        if (clearedCount % 10 === 0) {
          console.log(`Cleared ${clearedCount} pages...`)
        }
      } catch (error) {
        console.error(`Failed to archive page: ${error.message}`)
      }
    }
    
    hasMore = response.has_more
    startCursor = response.next_cursor
  }
  
  console.log(`Cleared ${clearedCount} existing pages`)
}

// Process all items
console.log(`Processing ${project.items.nodes.length} items...`)

let processedCount = 0
let failedCount = 0
const failedItems = []

for (const item of project.items.nodes) {
  // Skip archived items
  if (item.isArchived) {
    console.log('Skipping archived item')
    continue
  }
  
  const result = await createPage(item)
  if (result) {
    processedCount++
  } else {
    failedCount++
    failedItems.push({
      title: item.content?.title || 'Untitled',
      createdAt: item.createdAt
    })
  }
  
  // Show progress
  if ((processedCount + failedCount) % 10 === 0) {
    console.log(`Progress: ${processedCount + failedCount}/${project.items.nodes.length} (${processedCount} succeeded, ${failedCount} failed)`)
  }
  
  // Add a small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 200))
}

console.log(`\nImport completed!`)
console.log(`Successfully processed: ${processedCount} items`)
console.log(`Failed: ${failedCount} items`)

if (failedItems.length > 0) {
  console.log('\nFailed items:')
  failedItems.forEach(item => {
    console.log(`- ${item.title} (created: ${item.createdAt})`)
  })
  
  // Save failed items to a file for retry
  await fs.writeFile('failed-items.json', JSON.stringify(failedItems, null, 2))
  console.log('\nFailed items saved to failed-items.json')
}