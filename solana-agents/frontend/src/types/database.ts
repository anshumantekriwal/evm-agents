// Database types for the application
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  user_id: string
  agent_id: string
  name: string
  bot_type: 'dca' | 'range' | 'custom'
  config: any
  status: 'deploying' | 'running' | 'stopped' | 'error'
  url?: string
  created_at: string
  updated_at: string
  deployed_at?: string
  error_message?: string
}

export interface DeploymentLog {
  id: string
  agent_id: string
  message: string
  level: 'info' | 'warning' | 'error' | 'success'
  timestamp: string
  created_at: string
}

export interface SolanaAgent {
  id: number
  user_id: string
  user_email: string
  agent_name: string
  prompt?: string
  bot_type: 'dca' | 'range' | 'custom'
  config: any
  aws_url?: string
  owner_address?: string
  agent_wallet?: string
  status: 'deploying' | 'running' | 'stopped' | 'error'
  error_message?: string
  created_at: string
  updated_at: string
  deployed_at?: string
}
