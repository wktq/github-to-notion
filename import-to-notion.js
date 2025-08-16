#!/usr/bin/env node

import fs from 'node:fs/promises'
import { Client } from '@notionhq/client'
import { markdownToBlocks } from '@tryfabric/martian'

if (process.argv.length < 4) {
  console.error('Usage: node import-to-notion.js <project-file> <database-id> [<status-field>] [<label-field>] [<imported-field>]')
  process.exit(1)
}

const token = process.env.NOTION_TOKEN

if (!token) {
  console.error('Missing NOTION_TOKEN in environment')
  process.exit(1)
}

const projectFile = process.argv[2]
const id = process.argv[3]
const statusField = process.argv[4]
const labelField = process.argv[5]
const importedField = process.argv[6]
const project = JSON.parse(await fs.readFile(projectFile))

const notion = new Client({
  auth: token
})

const schema = await notion.databases.retrieve({
  database_id: id
})

function selectOrMultiselect (name, values) {
  const type = schema.properties[name].type

  switch (type) {
    case 'select':
      return { select: { name: values[0] } }
    case 'multi_select':
      return { multi_select: values.map(name => ({ name })) }
    default:
      throw new Error(`Unsupported type ${type}`)
  }
}

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

function getStatusFromFieldValues(fieldValues) {
  if (!fieldValues || !fieldValues.nodes) return null
  
  for (const fieldValue of fieldValues.nodes) {
    if (fieldValue.field && fieldValue.field.name === 'Status' && fieldValue.name) {
      return fieldValue.name
    }
  }
  
  return null
}

async function createPage (item) {
  // Get title from content or use a default
  let title = 'Untitled'
  if (item.content) {
    title = item.content.title || `${item.content.__typename} #${item.content.number}` || 'Untitled'
  }
  
  const payload = {
    parent: {
      database_id: id
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
            content: title
          }
        }
      ]
    }
  }
  
  // Add created/updated times if available
  if (item.createdAt) {
    payload.created_time = item.createdAt
  }
  if (item.updatedAt) {
    payload.last_edited_time = item.updatedAt
  }
  
  // Add status field
  const status = getStatusFromFieldValues(item.fieldValues)
  if (status && statusField && schema.properties[statusField]) {
    try {
      payload.properties[statusField] = selectOrMultiselect(statusField, [status])
    } catch (e) {
      console.warn(`Could not set status field: ${e.message}`)
    }
  }
  
  // Add imported field if specified
  if (importedField && schema.properties[importedField]) {
    payload.properties[importedField] = {
      checkbox: true
    }
  }
  
  // Process content-specific fields
  if (item.content) {
    // Add labels if available
    if (item.content.labels && item.content.labels.nodes && item.content.labels.nodes.length > 0 && labelField && schema.properties[labelField]) {
      try {
        payload.properties[labelField] = selectOrMultiselect(labelField, item.content.labels.nodes.map(label => label.name))
      } catch (e) {
        console.warn(`Could not set label field: ${e.message}`)
      }
    }
    
    // Convert content to blocks
    const markdown = getMarkdown(item.content)
    if (markdown) {
      try {
        const blocks = markdownToBlocks(markdown)
        payload.children = blocks
      } catch (e) {
        console.warn(`Could not convert markdown to blocks: ${e.message}`)
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

  try {
    await notion.pages.create(payload)
    console.log(`Created page: ${title}`)
  } catch (error) {
    console.error(`Failed to create page "${title}": ${error.message}`)
  }
}

// Process all items
console.log(`Processing ${project.items.nodes.length} items...`)

for (const item of project.items.nodes) {
  // Skip archived items
  if (item.isArchived) {
    console.log('Skipping archived item')
    continue
  }
  
  await createPage(item)
  
  // Add a small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 100))
}

console.log('Import completed!')