#!/usr/bin/env node

const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = 8788 // Different port from the main API

const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`)

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Parse the URL to get the filename
  const urlParts = req.url.split('/')
  const filename = urlParts[urlParts.length - 1]

  // Only serve specific test PDFs
  const allowedFiles = ['score_01.pdf', 'score_02.pdf']
  if (!allowedFiles.includes(filename)) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'File not found' }))
    return
  }

  // Construct the file path
  const filePath = path.join(__dirname, 'test-data', filename)

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      console.error(`File not found: ${filePath}`)
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'PDF file not found', path: filePath }))
      return
    }

    // Read and serve the file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error(`Error reading file: ${err}`)
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Failed to read PDF' }))
        return
      }

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      })
      res.end(data)
      console.log(`Served: ${filename}`)
    })
  })
})

server.listen(PORT, () => {
  console.log(`📚 Test PDF server running on http://localhost:${PORT}`)
  console.log(`   - http://localhost:${PORT}/score_01.pdf`)
  console.log(`   - http://localhost:${PORT}/score_02.pdf`)
  console.log('\nPress Ctrl+C to stop')
})
