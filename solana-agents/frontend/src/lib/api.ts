// Use proxy in development, direct URL in production
const isDevelopment = import.meta.env.DEV
const API_BASE_URL = isDevelopment 
  ? '/api' // Use proxy in development
  : (import.meta.env.VITE_DEPLOYER_URL || 'http://54.166.244.200')
const API_KEY = import.meta.env.VITE_API_KEY || 'Commune_dev1'

interface DeployAgentRequest {
  agentId: number
  ownerAddress: string
  botType: 'dca' | 'range' | 'custom'
  swapConfig: any
}

interface DeployAgentResponse {
  success: boolean
  agentUrl?: string
  error?: string
}

interface AgentLogsResponse {
  success: boolean
  logs?: any[]
  error?: string
}

interface AgentStatusResponse {
  success: boolean
  status?: any
  error?: string
}

class ApiService {
  private async makeRequest(endpoint: string, options: RequestInit = {}, retries = 3): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY || '',
            ...options.headers,
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`API Error (${response.status}): ${errorText}`)
        }

        return response.json()
      } catch (error) {
        console.warn(`API request attempt ${attempt} failed:`, error)
        
        if (attempt === retries) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              throw new Error('Request timeout - please check your network connection')
            }
            if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
              throw new Error('Network connection failed - please check if the API server is accessible')
            }
          }
          throw error
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
      }
    }
  }

  async deployAgent(request: DeployAgentRequest): Promise<DeployAgentResponse> {
    try {
      const result = await this.makeRequest('/deploy-agent', {
        method: 'POST',
        body: JSON.stringify(request),
      })
      
      return {
        success: true,
        agentUrl: result.agentUrl || result.url,
      }
    } catch (error) {
      console.error('Deploy agent error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getAgentLogs(agentId: number): Promise<AgentLogsResponse> {
    try {
      const result = await this.makeRequest(`/logs/${agentId}`)
      
      return {
        success: true,
        logs: result.logs || result.data || [],
      }
    } catch (error) {
      console.error('Get agent logs error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getAgentStatus(agentUrl: string): Promise<AgentStatusResponse> {
    try {
      // Call the agent's status endpoint directly
      const response = await fetch(`${agentUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`)
      }

      const result = await response.json()
      
      return {
        success: true,
        status: result.data || result,
      }
    } catch (error) {
      console.error('Get agent status error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  async getAgentLiveLogs(agentUrl: string): Promise<AgentLogsResponse> {
    try {
      // Call the agent's logs endpoint directly
      const response = await fetch(`${agentUrl}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Logs fetch failed: ${response.status}`)
      }

      const result = await response.json()
      
      return {
        success: true,
        logs: result.logs || result.data || [],
      }
    } catch (error) {
      console.error('Get agent live logs error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Health check for the deployer API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY || '',
        },
      })
      return response.ok
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }
}

export const apiService = new ApiService()
export type { DeployAgentRequest, DeployAgentResponse, AgentLogsResponse, AgentStatusResponse }
