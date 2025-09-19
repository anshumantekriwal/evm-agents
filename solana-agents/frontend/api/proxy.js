// Vercel serverless function to proxy API requests
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const API_BASE_URL = 'http://54.166.244.200'
  const { path, ...query } = req.query
  
  // Handle different types of proxy requests
  let targetUrl
  
  if (Array.isArray(path) && path[0] === 'agent-status') {
    // Handle agent status requests: /api/proxy?path=agent-status/encoded-url
    const encodedAgentUrl = path[1]
    const decodedAgentUrl = decodeURIComponent(encodedAgentUrl)
    targetUrl = `https://${decodedAgentUrl}`
  } else {
    // Handle regular API requests
    const targetPath = Array.isArray(path) ? path.join('/') : (path || '')
    targetUrl = `${API_BASE_URL}/${targetPath}`
  }
  
  // Add query parameters
  const queryString = new URLSearchParams(query).toString()
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl

  try {
    console.log(`Proxying ${req.method} request to: ${fullUrl}`)
    
    // Forward the request
    const response = await fetch(fullUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': req.headers['x-api-key'] || 'Commune_dev1',
        'Accept': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    })

    const data = await response.text()
    
    // Forward the response
    res.status(response.status)
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
    
    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(data)
      res.json(jsonData)
    } catch {
      // If not JSON, send as text
      res.send(data)
    }
  } catch (error) {
    console.error('Proxy error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Proxy request failed', 
      details: error.message 
    })
  }
}
