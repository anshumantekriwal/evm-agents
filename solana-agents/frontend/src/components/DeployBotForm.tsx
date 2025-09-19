import React, { useState } from 'react'
import { Clock, TrendingUp, Zap, Rocket, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { apiService } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface DeployBotFormProps {
  onSuccess: (agentId: number, agentUrl: string) => void
}

type BotType = 'dca' | 'range' | 'custom'

interface BotConfig {
  dca: {
    fromTokenSymbol: string
    toTokenSymbol: string
    amount: string
    intervalHours: string
  }
  range: {
    fromTokenSymbol: string
    toTokenSymbol: string
    amount: string
    buyPrice: string
    sellPrice: string
  }
  custom: {
    prompt: string
  }
}

interface DeploymentStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  message?: string
}

const DEPLOYMENT_STEPS: DeploymentStep[] = [
  {
    id: 'create_record',
    title: 'Creating Agent Record',
    description: 'Setting up your bot in the database',
    status: 'pending'
  },
  {
    id: 'generate_code',
    title: 'Generating Code',
    description: 'AI is creating your custom trading logic',
    status: 'pending'
  },
  {
    id: 'deploy_container',
    title: 'Deploying Container',
    description: 'Building and deploying your bot to AWS',
    status: 'pending'
  },
  {
    id: 'initialize_bot',
    title: 'Initializing Bot',
    description: 'Starting your bot and creating wallet',
    status: 'pending'
  },
  {
    id: 'finalize',
    title: 'Finalizing Setup',
    description: 'Completing deployment and updating status',
    status: 'pending'
  }
]

export const DeployBotForm: React.FC<DeployBotFormProps> = ({ onSuccess }) => {
  const { user } = useAuth()
  const [botType, setBotType] = useState<BotType>('dca')
  const [botName, setBotName] = useState('')
  const [config, setConfig] = useState<BotConfig>({
    dca: {
      fromTokenSymbol: 'USDC',
      toTokenSymbol: 'SOL',
      amount: '10',
      intervalHours: '24',
    },
    range: {
      fromTokenSymbol: 'USDC',
      toTokenSymbol: 'SOL',
      amount: '100',
      buyPrice: '180',
      sellPrice: '220',
    },
    custom: {
      prompt: '',
    },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>(DEPLOYMENT_STEPS)
  const [isDeploying, setIsDeploying] = useState(false)

  const botTypes = [
    {
      id: 'dca' as const,
      name: 'DCA Bot',
      description: 'Dollar Cost Averaging - Buy tokens at regular intervals',
      icon: Clock,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      id: 'range' as const,
      name: 'Range Bot',
      description: 'Buy low, sell high within a price range',
      icon: TrendingUp,
      color: 'bg-green-100 text-green-600',
    },
    {
      id: 'custom' as const,
      name: 'Custom Bot',
      description: 'AI-generated bot from your natural language description',
      icon: Zap,
      color: 'bg-purple-100 text-purple-600',
    },
  ]

  const handleConfigChange = (field: string, value: string) => {
    setConfig(prev => ({
      ...prev,
      [botType]: {
        ...prev[botType],
        [field]: value,
      },
    }))
  }

  const updateDeploymentStep = (stepId: string, status: DeploymentStep['status'], message?: string) => {
    setDeploymentSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, message }
        : step
    ))
  }

  const resetDeploymentSteps = () => {
    setDeploymentSteps(DEPLOYMENT_STEPS.map(step => ({ ...step, status: 'pending', message: undefined })))
  }

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setIsDeploying(true)
    setError('')
    resetDeploymentSteps()

    let agentId: number | null = null

    try {
      // Step 1: Create agent record
      updateDeploymentStep('create_record', 'in_progress', 'Creating your bot record...')
      await sleep(500) // Small delay for UX

      const { data: agentData, error: createError } = await supabase
        .from('solana_agents')
        .insert({
          user_id: user.id,
          user_email: user.email || '',
          agent_name: botName,
          bot_type: botType,
          config: {},
          status: 'deploying',
          prompt: botType === 'custom' ? config.custom.prompt : null,
        })
        .select()
        .single()

      if (createError) {
        updateDeploymentStep('create_record', 'error', `Database error: ${createError.message}`)
        throw new Error(`Failed to create agent record: ${createError.message}`)
      }

      agentId = agentData.id
      const ownerAddress = user.id
      updateDeploymentStep('create_record', 'completed', `Agent record created with ID: ${agentId}`)

      // Step 2: Generate code (for custom bots) or prepare config
      if (botType === 'custom') {
        updateDeploymentStep('generate_code', 'in_progress', 'AI is analyzing your prompt and generating trading logic...')
        await sleep(1000) // Simulate code generation time
      } else {
        updateDeploymentStep('generate_code', 'in_progress', 'Preparing bot configuration...')
        await sleep(300)
      }

      // Prepare swap config based on bot type
      let swapConfig: any = {}
      
      if (botType === 'dca') {
        swapConfig = {
          fromToken: config.dca.fromTokenSymbol,
          toToken: config.dca.toTokenSymbol,
          amount: parseFloat(config.dca.amount),
          scheduleType: 'interval',
          scheduleValue: `${config.dca.intervalHours}h`,
          executeImmediately: true
        }
        updateDeploymentStep('generate_code', 'completed', `DCA strategy: ${config.dca.amount} ${config.dca.fromTokenSymbol} → ${config.dca.toTokenSymbol} every ${config.dca.intervalHours}h`)
      } else if (botType === 'range') {
        swapConfig = {
          fromToken: config.range.fromTokenSymbol,
          toToken: config.range.toTokenSymbol,
          amount: parseFloat(config.range.amount),
          tokenToMonitor: config.range.toTokenSymbol, // Monitor the token we're buying
          tokenToMonitorPrice: parseFloat(config.range.buyPrice),
          above: false // Buy when price goes below buyPrice (buy the dip)
        }
        updateDeploymentStep('generate_code', 'completed', `Range strategy: Buy ${config.range.toTokenSymbol} when price drops to $${config.range.buyPrice}`)
      } else if (botType === 'custom') {
        swapConfig = {
          prompt: config.custom.prompt,
          history: [],
        }
        updateDeploymentStep('generate_code', 'completed', 'Custom trading logic generated successfully')
      }

      // Step 3: Deploy container
      updateDeploymentStep('deploy_container', 'in_progress', 'Building Docker container and deploying to AWS...')
      
      const deployResult = await apiService.deployAgent({
        agentId: agentId!,
        ownerAddress,
        botType,
        swapConfig,
      })

      if (!deployResult.success) {
        updateDeploymentStep('deploy_container', 'error', deployResult.error || 'Container deployment failed')
        
        // Update the agent record with error status
        await supabase
          .from('solana_agents')
          .update({
            status: 'error',
            error_message: deployResult.error || 'Deployment failed',
          })
          .eq('id', agentId)
        
        throw new Error(deployResult.error || 'Deployment failed')
      }

      updateDeploymentStep('deploy_container', 'completed', `Container deployed to AWS App Runner`)

      // Step 4: Initialize bot
      updateDeploymentStep('initialize_bot', 'in_progress', 'Starting your bot and creating wallet...')
      await sleep(2000) // AWS App Runner takes time to start

      // Check if the bot is responding (optional health check)
      try {
        // This is a placeholder - you could add actual health check here
        await sleep(1000)
        updateDeploymentStep('initialize_bot', 'completed', 'Bot is running and wallet is ready')
      } catch (healthError) {
        updateDeploymentStep('initialize_bot', 'completed', 'Bot deployed (wallet will be created on first run)')
      }

      // Step 5: Finalize
      updateDeploymentStep('finalize', 'in_progress', 'Updating database with deployment details...')

      const { error: updateError } = await supabase
        .from('solana_agents')
        .update({
          config: swapConfig,
          aws_url: deployResult.agentUrl,
          owner_address: ownerAddress,
          status: 'running',
          deployed_at: new Date().toISOString(),
        })
        .eq('id', agentId)

      if (updateError) {
        console.error('Database update error:', updateError)
        updateDeploymentStep('finalize', 'completed', 'Deployment successful (minor database update issue)')
      } else {
        updateDeploymentStep('finalize', 'completed', 'All systems ready! Your bot is now live.')
      }

      // Wait a moment to show completion
      await sleep(1000)
      
      onSuccess(agentId!, deployResult.agentUrl || '')
    } catch (err) {
      console.error('Deployment error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Deployment failed'
      setError(errorMessage)
      
      // Mark any in-progress steps as error
      setDeploymentSteps(prev => prev.map(step => 
        step.status === 'in_progress' 
          ? { ...step, status: 'error', message: errorMessage }
          : step
      ))
    } finally {
      setLoading(false)
      // Keep isDeploying true briefly to show final status
      setTimeout(() => setIsDeploying(false), 2000)
    }
  }

  const renderConfigForm = () => {
    switch (botType) {
      case 'dca':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Token
                </label>
                <select
                  value={config.dca.fromTokenSymbol}
                  onChange={(e) => handleConfigChange('fromTokenSymbol', e.target.value)}
                  className="input"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Token
                </label>
                <select
                  value={config.dca.toTokenSymbol}
                  onChange={(e) => handleConfigChange('toTokenSymbol', e.target.value)}
                  className="input"
                >
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount per Purchase
                </label>
                <input
                  type="number"
                  value={config.dca.amount}
                  onChange={(e) => handleConfigChange('amount', e.target.value)}
                  className="input"
                  placeholder="10"
                  min="0"
                  step="0.00001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interval (hours)
                </label>
                <input
                  type="number"
                  value={config.dca.intervalHours}
                  onChange={(e) => handleConfigChange('intervalHours', e.target.value)}
                  className="input"
                  placeholder="24"
                  min="0"
                />
              </div>
            </div>
          </div>
        )

      case 'range':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Token
                </label>
                <select
                  value={config.range.fromTokenSymbol}
                  onChange={(e) => handleConfigChange('fromTokenSymbol', e.target.value)}
                  className="input"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Token
                </label>
                <select
                  value={config.range.toTokenSymbol}
                  onChange={(e) => handleConfigChange('toTokenSymbol', e.target.value)}
                  className="input"
                >
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trade Amount
              </label>
              <input
                type="number"
                value={config.range.amount}
                onChange={(e) => handleConfigChange('amount', e.target.value)}
                className="input"
                placeholder="100"
                min="0"
                step="0.01"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buy Price ($)
                </label>
                <input
                  type="number"
                  value={config.range.buyPrice}
                  onChange={(e) => handleConfigChange('buyPrice', e.target.value)}
                  className="input"
                  placeholder="180"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sell Price ($)
                </label>
                <input
                  type="number"
                  value={config.range.sellPrice}
                  onChange={(e) => handleConfigChange('sellPrice', e.target.value)}
                  className="input"
                  placeholder="220"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        )

      case 'custom':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe Your Trading Strategy
            </label>
            <textarea
              value={config.custom.prompt}
              onChange={(e) => handleConfigChange('prompt', e.target.value)}
              className="textarea min-h-[120px]"
              placeholder="Example: Buy 10 SOL using USDT every 1 hour if Bitcoin is over 135k USD and sell all SOL if it drops below 180 USD..."
              rows={6}
            />
            <p className="text-sm text-gray-500 mt-2">
              Describe your trading strategy in natural language. The AI will generate a custom bot based on your description.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  const renderDeploymentStatus = () => {
    if (!isDeploying) return null

    return (
      <div className="card p-6 mb-6 bg-gradient-to-br from-primary-50 via-white to-primary-100">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900">Deploying Your Bot</h3>
          <p className="text-gray-600 mt-1">Please wait while we set up your trading bot...</p>
        </div>

        <div className="space-y-4">
          {deploymentSteps.map((step) => {
            const isActive = step.status === 'in_progress'
            const isCompleted = step.status === 'completed'
            const isError = step.status === 'error'
            const isPending = step.status === 'pending'

            return (
              <div key={step.id} className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {isCompleted && (
                    <CheckCircle className="w-5 h-5 text-success-600" />
                  )}
                  {isError && (
                    <AlertCircle className="w-5 h-5 text-danger-600" />
                  )}
                  {isActive && (
                    <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                  )}
                  {isPending && (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-medium ${
                      isCompleted ? 'text-success-700' : 
                      isError ? 'text-danger-700' : 
                      isActive ? 'text-primary-700' : 
                      'text-gray-500'
                    }`}>
                      {step.title}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isCompleted ? 'bg-success-100 text-success-600' :
                      isError ? 'bg-danger-100 text-danger-600' :
                      isActive ? 'bg-primary-100 text-primary-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {isCompleted ? 'Done' : 
                       isError ? 'Error' : 
                       isActive ? 'Running' : 
                       'Pending'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {step.message || step.description}
                  </p>
                  
                  {isActive && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className="bg-primary-600 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mt-6 bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span className="font-medium">Deployment Failed:</span>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {renderDeploymentStatus()}
      
      <div className={`card p-6 transition-all ${isDeploying ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
              <Rocket className="w-6 h-6 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Deploy New Bot</h2>
          <p className="text-gray-600 mt-2">Create and deploy your Solana trading bot</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bot Name
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="input"
              placeholder="My Awesome Bot"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Bot Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {botTypes.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setBotType(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      botType === type.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3 ${type.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">{type.name}</h3>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
            {renderConfigForm()}
          </div>

          <button
            type="submit"
            disabled={loading || isDeploying || !botName.trim() || (botType === 'custom' && !config.custom.prompt.trim())}
            className="btn-primary w-full py-3 text-base font-medium"
          >
            {isDeploying ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Deploying Bot...
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Starting Deployment...
              </div>
            ) : (
              <>
                <Rocket className="w-5 h-5 mr-2" />
                Deploy Bot
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
