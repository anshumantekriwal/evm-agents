import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiService } from '../lib/api'
import type { SolanaAgent } from '../types'
import { 
  Bot, 
  Clock, 
  TrendingUp, 
  Zap, 
  Trash2, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { format } from 'date-fns'

interface DashboardProps {
  onDeployNew: () => void
  onViewBot: (agentId: number) => void
}

export const Dashboard: React.FC<DashboardProps> = ({ onDeployNew, onViewBot }) => {
  const { user } = useAuth()
  const [agents, setAgents] = useState<SolanaAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState<number | null>(null)

  const loadAgents = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('solana_agents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAgents(data || [])
    } catch (err) {
      console.error('Error loading agents:', err)
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  const refreshAgentStatus = async (agent: SolanaAgent) => {
    if (!agent.aws_url) return

    setRefreshing(agent.id)
    try {
      const statusResult = await apiService.getAgentStatus(agent.aws_url)
      
      let newStatus = agent.status
      let agentWallet = agent.agent_wallet
      
      if (statusResult.success && statusResult.status) {
        // Determine status based on the response
        if (statusResult.status.running || statusResult.status.active) {
          newStatus = 'running'
        } else if (statusResult.status.error) {
          newStatus = 'error'
        } else {
          newStatus = 'stopped'
        }
        
        // Extract agent wallet if available in status
        if (statusResult.status.wallet || statusResult.status.walletAddress) {
          agentWallet = statusResult.status.wallet || statusResult.status.walletAddress
        }
      }

      // Update in database
      const { error } = await supabase
        .from('solana_agents')
        .update({ 
          status: newStatus,
          agent_wallet: agentWallet,
          updated_at: new Date().toISOString()
        })
        .eq('id', agent.id)

      if (!error) {
        setAgents(prev => prev.map(a => 
          a.id === agent.id 
            ? { ...a, status: newStatus, agent_wallet: agentWallet, updated_at: new Date().toISOString() }
            : a
        ))
      }
    } catch (err) {
      console.error('Error refreshing status:', err)
    } finally {
      setRefreshing(null)
    }
  }

  const deleteAgent = async (agent: SolanaAgent) => {
    if (!confirm(`Are you sure you want to delete "${agent.agent_name}"?`)) return

    try {
      const { error } = await supabase
        .from('solana_agents')
        .delete()
        .eq('id', agent.id)

      if (error) throw error
      
      setAgents(prev => prev.filter(a => a.id !== agent.id))
    } catch (err) {
      console.error('Error deleting agent:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete agent')
    }
  }

  useEffect(() => {
    loadAgents()
  }, [user])

  const getBotTypeIcon = (botType: string) => {
    switch (botType) {
      case 'dca': return Clock
      case 'range': return TrendingUp
      case 'custom': return Zap
      default: return Bot
    }
  }

  const getBotTypeColor = (botType: string) => {
    switch (botType) {
      case 'dca': return 'bg-blue-100 text-blue-600'
      case 'range': return 'bg-green-100 text-green-600'
      case 'custom': return 'bg-purple-100 text-purple-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return CheckCircle
      case 'error': return XCircle
      case 'deploying': return RefreshCw
      default: return AlertCircle
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-success-600'
      case 'error': return 'text-danger-600'
      case 'deploying': return 'text-primary-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your bots...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your Solana trading bots</p>
        </div>
        <button
          onClick={onDeployNew}
          className="btn-primary"
        >
          <Bot className="w-4 h-4 mr-2" />
          Deploy New Bot
        </button>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {agents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bot className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bots deployed yet</h3>
          <p className="text-gray-600 mb-6">Get started by deploying your first trading bot</p>
          <button
            onClick={onDeployNew}
            className="btn-primary"
          >
            <Bot className="w-4 h-4 mr-2" />
            Deploy Your First Bot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const BotIcon = getBotTypeIcon(agent.bot_type)
            const StatusIcon = getStatusIcon(agent.status)
            
            return (
              <div key={agent.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onViewBot(agent.id)}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBotTypeColor(agent.bot_type)}`}>
                      <BotIcon className="w-5 h-5" />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-gray-900">{agent.agent_name}</h3>
                      <p className="text-sm text-gray-500 capitalize">{agent.bot_type} Bot</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusIcon className={`w-5 h-5 ${getStatusColor(agent.status)} ${agent.status === 'deploying' ? 'animate-spin' : ''}`} />
                    <span className={`text-sm font-medium capitalize ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Created:</span> {format(new Date(agent.created_at), 'MMM d, yyyy')}
                  </div>
                  {agent.deployed_at && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Deployed:</span> {format(new Date(agent.deployed_at), 'MMM d, yyyy')}
                    </div>
                  )}
                  {agent.agent_wallet && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Wallet:</span> 
                      <span className="font-mono text-xs ml-1">{agent.agent_wallet.slice(0, 8)}...{agent.agent_wallet.slice(-8)}</span>
                    </div>
                  )}
                  {agent.error_message && (
                    <div className="text-sm text-danger-600">
                      <span className="font-medium">Error:</span> {agent.error_message}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    {agent.aws_url && (
                      <a
                        href={`${agent.aws_url}/html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                        title="View logs"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => refreshAgentStatus(agent)}
                      disabled={refreshing === agent.id}
                      className="text-gray-600 hover:text-gray-700 disabled:opacity-50"
                      title="Refresh status"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing === agent.id ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => deleteAgent(agent)}
                    className="text-danger-600 hover:text-danger-700"
                    title="Delete bot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
