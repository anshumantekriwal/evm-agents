import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiService } from '../lib/api'
import type { SolanaAgent } from '../types'
import { 
  ArrowLeft,
  Bot, 
  Clock, 
  TrendingUp, 
  Zap, 
  ExternalLink, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Wallet,
  Terminal,
  Globe,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'
import { format } from 'date-fns'

interface BotPageProps {
  agentId: number
  onBack: () => void
}

interface BotStatus {
  status: string
  stage?: string
  message?: string
  timestamp?: string
  success?: boolean
  details?: any
  scheduleInfo?: any
}

interface BotLogs {
  logs: {
    logGroupName: string
    totalEvents: number
    logs: Array<{
      timestamp: string
      message: string
      logStreamName: string
    }>
    retrievedAt: string
  }
  agentId?: number
}

export const BotPage: React.FC<BotPageProps> = ({ agentId, onBack }) => {
  const { user } = useAuth()
  const [agent, setAgent] = useState<SolanaAgent | null>(null)
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [logs, setLogs] = useState<BotLogs | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showFullLogs, setShowFullLogs] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Load agent data from Supabase
  const loadAgent = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('solana_agents')
        .select('*')
        .eq('id', agentId)
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setAgent(data)
    } catch (err) {
      console.error('Error loading agent:', err)
      setError(err instanceof Error ? err.message : 'Failed to load agent')
    }
  }

  // Fetch status from AWS URL
  const fetchStatus = async () => {
    if (!agent?.aws_url) return

    setStatusLoading(true)
    try {
      const statusResult = await apiService.getAgentStatus(agent.aws_url)
      if (statusResult.success && statusResult.status) {
        setStatus(statusResult.status)
      } else {
        console.warn('Status endpoint not available yet')
        setStatus({ status: 'starting', message: 'Bot is starting up...' })
      }
    } catch (err) {
      console.warn('Status fetch failed:', err)
      setStatus({ status: 'unknown', message: 'Status unavailable' })
    } finally {
      setStatusLoading(false)
    }
  }

  // Fetch logs from deployer API
  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const logsData = await apiService.getAgentLogs(agentId)
      if (logsData.success && logsData.logs) {
        // Handle different possible response structures
        if (Array.isArray(logsData.logs)) {
          // Simple array of logs
          setLogs({
            logs: {
              logGroupName: `agent-${agentId}`,
              totalEvents: logsData.logs.length,
              logs: logsData.logs.map((log: any) => ({
                timestamp: log.timestamp || new Date().toISOString(),
                message: log.message || log.toString(),
                logStreamName: log.logStreamName || `stream-${agentId}`
              })),
              retrievedAt: new Date().toISOString()
            },
            agentId: agentId
          })
        } else if (logsData.logs && typeof logsData.logs === 'object' && 'logs' in logsData.logs) {
          // Structured logs response
          setLogs({
            logs: logsData.logs as any,
            agentId: agentId
          })
        }
      }
    } catch (err) {
      console.warn('Logs fetch failed:', err)
    } finally {
      setLogsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await loadAgent()
      setLoading(false)
    }
    init()
  }, [agentId, user])

  // Load status and logs when agent is available
  useEffect(() => {
    if (agent) {
      fetchStatus()
      fetchLogs()
    }
  }, [agent])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !agent) return

    const interval = setInterval(() => {
      fetchStatus()
      fetchLogs()
    }, 10000) // Refresh every 10 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, agent])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getBotTypeIcon = (botType: string) => {
    switch (botType) {
      case 'dca': return Clock
      case 'range': return TrendingUp
      case 'twitter': return TrendingUp
      case 'custom': return Zap
      default: return Bot
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running': return 'text-success-600 bg-success-100'
      case 'stopped': return 'text-gray-600 bg-gray-100'
      case 'error': return 'text-danger-600 bg-danger-100'
      case 'deploying': return 'text-orange-600 bg-orange-100'
      case 'starting': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'running': return CheckCircle
      case 'error': return XCircle
      case 'deploying':
      case 'starting': return RefreshCw
      default: return AlertCircle
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <XCircle className="w-16 h-16 text-danger-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Bot Not Found</h2>
        <p className="text-gray-600 mb-6">{error || 'The requested bot could not be found.'}</p>
        <button
          onClick={onBack}
          className="btn-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </button>
      </div>
    )
  }

  const BotIcon = getBotTypeIcon(agent.bot_type)
  const StatusIcon = getStatusIcon(status?.status || agent.status)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <BotIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{agent.agent_name}</h1>
              <p className="text-gray-600 capitalize">Agent ID: {agent.id} • {agent.bot_type} Bot</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              autoRefresh 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </button>
          
          {agent.aws_url && (
            <a
              href={agent.aws_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Bot
            </a>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Status */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Status</h3>
            <StatusIcon className={`w-5 h-5 ${statusLoading ? 'animate-spin' : ''}`} />
          </div>
          
          <div className="space-y-3">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status?.status || agent.status)}`}>
              {status?.status || agent.status}
            </div>
            
            {status?.message && (
              <p className="text-sm text-gray-600">{status.message}</p>
            )}
            
            {status?.timestamp && (
              <p className="text-xs text-gray-500">
                Last updated: {format(new Date(status.timestamp), 'MMM dd, HH:mm:ss')}
              </p>
            )}
          </div>
        </div>

        {/* Bot Info */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
            <Bot className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Type:</span>
              <span className="text-sm font-medium capitalize">{agent.bot_type}</span>
            </div>
            
            {agent.config && typeof agent.config === 'object' && (
              <>
                {agent.config.fromToken && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">From:</span>
                    <span className="text-sm font-medium">{agent.config.fromToken}</span>
                  </div>
                )}
                {agent.config.toToken && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">To:</span>
                    <span className="text-sm font-medium">{agent.config.toToken}</span>
                  </div>
                )}
                {agent.config.amount && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Amount:</span>
                    <span className="text-sm font-medium">{agent.config.amount}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Wallet Info */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Wallet</h3>
            <Wallet className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {agent.agent_wallet ? (
              <div>
                <p className="text-sm text-gray-600 mb-1">Agent Wallet:</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    {agent.agent_wallet.slice(0, 8)}...{agent.agent_wallet.slice(-8)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(agent.agent_wallet!)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Wallet being created...</p>
            )}
            
            {agent.owner_address && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Owner:</p>
                <div className="flex items-center space-x-2">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    {agent.owner_address.slice(0, 8)}...{agent.owner_address.slice(-8)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(agent.owner_address!)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Info (for DCA/Range bots) */}
      {status?.details?.scheduleInfo && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Schedule Information</h3>
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Type:</span>
                <span className="text-sm font-medium capitalize">{status.details.scheduleType}</span>
              </div>
              
              {status.details.intervalMs && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Interval:</span>
                  <span className="text-sm font-medium">{Math.round(status.details.intervalMs / 60000)}m</span>
                </div>
              )}
              
              {status.details.nextExecutionTime && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Next Execution:</span>
                  <span className="text-sm font-medium">
                    {format(new Date(status.details.nextExecutionTime), 'MMM dd, HH:mm:ss')}
                  </span>
                </div>
              )}
            </div>
            
            {status.details.lastExecution && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-900">Last Execution</h4>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`text-sm font-medium ${status.details.lastExecution.success ? 'text-success-600' : 'text-danger-600'}`}>
                    {status.details.lastExecution.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="text-sm font-medium">{status.details.lastExecution.duration}</span>
                </div>
                {status.details.lastExecution.details?.signature && (
                  <div>
                    <span className="text-sm text-gray-600">Transaction:</span>
                    <div className="flex items-center space-x-2 mt-1">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                        {status.details.lastExecution.details.signature.slice(0, 16)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(status.details.lastExecution.details.signature)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Twitter Bot Configuration */}
      {(agent.bot_type as string) === 'twitter' && agent.config && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Twitter Configuration</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="bg-sky-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Monitoring:</span>
              <span className="text-sm font-medium text-sky-700">@{agent.config.twitterUsername}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Trade Amount:</span>
              <span className="text-sm font-medium">{agent.config.amount} {agent.config.fromToken} → {agent.config.toToken}</span>
            </div>
            {agent.config.monitorKeywords && (
              <div>
                <span className="text-sm text-gray-600">Keywords:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {agent.config.monitorKeywords.map((keyword: string, index: number) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Bot Prompt */}
      {agent.bot_type === 'custom' && agent.prompt && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">AI Prompt</h3>
            <Zap className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 italic">"{agent.prompt}"</p>
          </div>
        </div>
      )}

      {/* Logs Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Logs</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFullLogs(!showFullLogs)}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showFullLogs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={fetchLogs}
              disabled={logsLoading}
              className="text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </button>
            <Terminal className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        
        {logsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : logs?.logs?.logs?.length ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 mb-3">
              Showing {logs.logs.logs.length} of {logs.logs.totalEvents} log entries
              {logs.logs.retrievedAt && (
                <span className="ml-2">
                  • Updated {format(new Date(logs.logs.retrievedAt), 'MMM dd, HH:mm:ss')}
                </span>
              )}
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-1 font-mono text-sm">
                {logs.logs.logs
                  .slice(0, showFullLogs ? undefined : 10)
                  .map((log, index) => (
                    <div key={index} className="flex space-x-3">
                      <span className="text-gray-400 flex-shrink-0">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </span>
                      <span className="text-green-400 flex-1 break-all">
                        {log.message}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            
            {!showFullLogs && logs.logs.logs.length > 10 && (
              <button
                onClick={() => setShowFullLogs(true)}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Show all {logs.logs.logs.length} logs
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <Terminal className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No logs available yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Logs will appear once your bot starts running
            </p>
          </div>
        )}
      </div>

      {/* Deployment Info */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Deployment Details</h3>
          <Globe className="w-5 h-5 text-gray-400" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="text-sm font-medium">
                {format(new Date(agent.created_at), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
            
            {agent.deployed_at && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deployed:</span>
                <span className="text-sm font-medium">
                  {format(new Date(agent.deployed_at), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Updated:</span>
              <span className="text-sm font-medium">
                {format(new Date(agent.updated_at), 'MMM dd, yyyy HH:mm')}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            {agent.aws_url && (
              <div>
                <span className="text-sm text-gray-600">AWS URL:</span>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all">
                    {agent.aws_url}
                  </code>
                  <button
                    onClick={() => copyToClipboard(agent.aws_url!)}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            {agent.error_message && (
              <div>
                <span className="text-sm text-danger-600">Error:</span>
                <p className="text-sm text-danger-700 mt-1">{agent.error_message}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
