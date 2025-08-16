#!/usr/bin/env node

import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'

if (process.argv.length < 3) {
  console.error('Usage: node dump-github-project.js <project-url>')
  process.exit(1)
}

const token = process.env.GITHUB_TOKEN

if (!token) {
  console.error('Missing GITHUB_TOKEN in environment')
  process.exit(1)
}

const projectUrl = process.argv[2]
const parts = projectUrl.split('/')

if (parts[5] !== 'projects') {
  console.error('Not a GitHub project URL')
  process.exit(1)
}

const isOrgProject = parts[2] === 'github.com' && parts[3] === 'orgs'
const owner = isOrgProject ? parts[4] : parts[3]
const repo = isOrgProject ? null : parts[4]
const projectNumber = Number(parts[6])

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
  },
})

const octokit = new Octokit({
  auth: token
})

async function getProjectV2() {
  if (repo) {
    // Repository project
    const query = `
      query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          projectV2(number: $number) {
          id
          title
          shortDescription
          readme
          number
          public
          closed
          url
          items(first: 100) {
            totalCount
            nodes {
              id
              type
              createdAt
              updatedAt
              isArchived
              content {
                ... on DraftIssue {
                  title
                  body
                }
                ... on Issue {
                  id
                  number
                  title
                  body
                  state
                  url
                  comments(first: 100) {
                    totalCount
                    nodes {
                      id
                      body
                      createdAt
                      author {
                        login
                      }
                    }
                  }
                  author {
                    login
                  }
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                  labels(first: 20) {
                    nodes {
                      name
                      color
                    }
                  }
                }
                ... on PullRequest {
                  id
                  number
                  title
                  body
                  state
                  url
                  comments(first: 100) {
                    totalCount
                    nodes {
                      id
                      body
                      createdAt
                      author {
                        login
                      }
                    }
                  }
                  author {
                    login
                  }
                  assignees(first: 10) {
                    nodes {
                      login
                    }
                  }
                  labels(first: 20) {
                    nodes {
                      name
                      color
                    }
                  }
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldIterationValue {
                    title
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
          views(first: 20) {
            nodes {
              id
              name
              layout
            }
          }
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                dataType
                options {
                  id
                  name
                  color
                }
              }
              ... on ProjectV2IterationField {
                id
                name
                dataType
                configuration {
                  iterations {
                    id
                    title
                    startDate
                    duration
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  try {
    const response = await graphqlWithAuth(query, {
      owner,
      repo,
      number: projectNumber
    })

    if (!response.repository || !response.repository.projectV2) {
      console.error('Project not found')
      process.exit(1)
    }

    let project = response.repository.projectV2
    let allItems = [...project.items.nodes]
    let hasNextPage = project.items.pageInfo.hasNextPage
    let cursor = project.items.pageInfo.endCursor

    while (hasNextPage) {
      const paginationQuery = `
        query($owner: String!, $repo: String!, $number: Int!, $cursor: String!) {
          repository(owner: $owner, name: $repo) {
            projectV2(number: $number) {
              items(first: 100, after: $cursor) {
                nodes {
                  id
                  type
                  createdAt
                  updatedAt
                  isArchived
                  content {
                    ... on DraftIssue {
                      title
                      body
                    }
                    ... on Issue {
                      id
                      number
                      title
                      body
                      state
                      url
                      comments(first: 100) {
                        totalCount
                        nodes {
                          id
                          body
                          createdAt
                          author {
                            login
                          }
                        }
                      }
                      author {
                        login
                      }
                      assignees(first: 10) {
                        nodes {
                          login
                        }
                      }
                      labels(first: 20) {
                        nodes {
                          name
                          color
                        }
                      }
                    }
                    ... on PullRequest {
                      id
                      number
                      title
                      body
                      state
                      url
                      comments(first: 100) {
                        totalCount
                        nodes {
                          id
                          body
                          createdAt
                          author {
                            login
                          }
                        }
                      }
                      author {
                        login
                      }
                      assignees(first: 10) {
                        nodes {
                          login
                        }
                      }
                      labels(first: 20) {
                        nodes {
                          name
                          color
                        }
                      }
                    }
                  }
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldTextValue {
                        text
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldDateValue {
                        date
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldIterationValue {
                        title
                        field {
                          ... on ProjectV2FieldCommon {
                            name
                          }
                        }
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `

      const nextPage = await graphqlWithAuth(paginationQuery, {
        owner,
        repo,
        number: projectNumber,
        cursor
      })

      allItems = [...allItems, ...nextPage.repository.projectV2.items.nodes]
      hasNextPage = nextPage.repository.projectV2.items.pageInfo.hasNextPage
      cursor = nextPage.repository.projectV2.items.pageInfo.endCursor
    }

    project.items.nodes = allItems
    project.items.totalCount = allItems.length

    return project
  } catch (error) {
    console.error('Error fetching project:', error.message)
    if (error.errors) {
      console.error('GraphQL errors:', error.errors)
    }
    process.exit(1)
  }
  } else {
    // Organization project
    const query = `
      query($owner: String!, $number: Int!) {
        organization(login: $owner) {
          projectV2(number: $number) {
            id
            title
            shortDescription
            readme
            number
            public
            closed
            url
            items(first: 100) {
              totalCount
              nodes {
                id
                type
                createdAt
                updatedAt
                isArchived
                content {
                  ... on DraftIssue {
                    title
                    body
                  }
                  ... on Issue {
                    id
                    number
                    title
                    body
                    state
                    url
                    comments(first: 100) {
                      totalCount
                      nodes {
                        id
                        body
                        createdAt
                        author {
                          login
                        }
                      }
                    }
                    author {
                      login
                    }
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                    labels(first: 20) {
                      nodes {
                        name
                        color
                      }
                    }
                  }
                  ... on PullRequest {
                    id
                    number
                    title
                    body
                    state
                    url
                    comments(first: 100) {
                      totalCount
                      nodes {
                        id
                        body
                        createdAt
                        author {
                          login
                        }
                      }
                    }
                    author {
                      login
                    }
                    assignees(first: 10) {
                      nodes {
                        login
                      }
                    }
                    labels(first: 20) {
                      nodes {
                        name
                        color
                      }
                    }
                  }
                }
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldTextValue {
                      text
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldNumberValue {
                      number
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldDateValue {
                      date
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                    ... on ProjectV2ItemFieldIterationValue {
                      title
                      field {
                        ... on ProjectV2FieldCommon {
                          name
                        }
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
            views(first: 20) {
              nodes {
                id
                name
                layout
              }
            }
            fields(first: 20) {
              nodes {
                ... on ProjectV2Field {
                  id
                  name
                  dataType
                }
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                    color
                  }
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  dataType
                  configuration {
                    iterations {
                      id
                      title
                      startDate
                      duration
                    }
                  }
                }
              }
            }
          }
        }
      }
    `

    try {
      const response = await graphqlWithAuth(query, {
        owner,
        number: projectNumber
      })

      if (!response.organization || !response.organization.projectV2) {
        console.error('Project not found')
        process.exit(1)
      }

      let project = response.organization.projectV2
      let allItems = [...project.items.nodes]
      let hasNextPage = project.items.pageInfo.hasNextPage
      let cursor = project.items.pageInfo.endCursor

      while (hasNextPage) {
        const paginationQuery = `
          query($owner: String!, $number: Int!, $cursor: String!) {
            organization(login: $owner) {
              projectV2(number: $number) {
                items(first: 100, after: $cursor) {
                  nodes {
                    id
                    type
                    createdAt
                    updatedAt
                    isArchived
                    content {
                      ... on DraftIssue {
                        title
                        body
                      }
                      ... on Issue {
                        id
                        number
                        title
                        body
                        state
                        url
                        comments(first: 100) {
                          totalCount
                          nodes {
                            id
                            body
                            createdAt
                            author {
                              login
                            }
                          }
                        }
                        author {
                          login
                        }
                        assignees(first: 10) {
                          nodes {
                            login
                          }
                        }
                        labels(first: 20) {
                          nodes {
                            name
                            color
                          }
                        }
                      }
                      ... on PullRequest {
                        id
                        number
                        title
                        body
                        state
                        url
                        comments(first: 100) {
                          totalCount
                          nodes {
                            id
                            body
                            createdAt
                            author {
                              login
                            }
                          }
                        }
                        author {
                          login
                        }
                        assignees(first: 10) {
                          nodes {
                            login
                          }
                        }
                        labels(first: 20) {
                          nodes {
                            name
                            color
                          }
                        }
                      }
                    }
                    fieldValues(first: 20) {
                      nodes {
                        ... on ProjectV2ItemFieldTextValue {
                          text
                          field {
                            ... on ProjectV2FieldCommon {
                              name
                            }
                          }
                        }
                        ... on ProjectV2ItemFieldNumberValue {
                          number
                          field {
                            ... on ProjectV2FieldCommon {
                              name
                            }
                          }
                        }
                        ... on ProjectV2ItemFieldDateValue {
                          date
                          field {
                            ... on ProjectV2FieldCommon {
                              name
                            }
                          }
                        }
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          name
                          field {
                            ... on ProjectV2FieldCommon {
                              name
                            }
                          }
                        }
                        ... on ProjectV2ItemFieldIterationValue {
                          title
                          field {
                            ... on ProjectV2FieldCommon {
                              name
                            }
                          }
                        }
                      }
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
          }
        `

        const nextPage = await graphqlWithAuth(paginationQuery, {
          owner,
          number: projectNumber,
          cursor
        })

        allItems = [...allItems, ...nextPage.organization.projectV2.items.nodes]
        hasNextPage = nextPage.organization.projectV2.items.pageInfo.hasNextPage
        cursor = nextPage.organization.projectV2.items.pageInfo.endCursor
      }

      project.items.nodes = allItems
      project.items.totalCount = allItems.length

      return project
    } catch (error) {
      console.error('Error fetching project:', error.message)
      if (error.errors) {
        console.error('GraphQL errors:', error.errors)
      }
      process.exit(1)
    }
  }
}

const project = await getProjectV2()

console.error(`Found project: ${project.title}`)
console.error(`Total items: ${project.items.totalCount}`)

let draftIssues = 0
let issues = 0
let pullRequests = 0
let commentsCount = 0

for (const item of project.items.nodes) {
  if (!item.content) {
    draftIssues += 1
    continue
  }

  if (item.content.__typename === 'Issue') {
    issues += 1
    if (item.content.comments && item.content.comments.nodes) {
      commentsCount += item.content.comments.nodes.length
    }
  } else if (item.content.__typename === 'PullRequest') {
    pullRequests += 1
    if (item.content.comments && item.content.comments.nodes) {
      commentsCount += item.content.comments.nodes.length
    }
  } else if (item.content.__typename === 'DraftIssue') {
    draftIssues += 1
  }
}

const statusField = project.fields.nodes.find(field => field.name === 'Status')
if (statusField) {
  console.error(`Found Status field with ${statusField.options ? statusField.options.length : 0} options`)
}

console.log(JSON.stringify(project, null, 2))

console.error(`Total ${draftIssues} draft issues, ${issues} issues, and ${pullRequests} pull requests, including ${commentsCount} comments`)