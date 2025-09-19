import { useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import { DeployBotForm } from './components/DeployBotForm'
import { BotPage } from './components/BotPage'
import { CheckCircle } from 'lucide-react'

type Page = 'dashboard' | 'deploy' | 'settings' | 'bot'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [deploySuccess, setDeploySuccess] = useState<{ agentId: number; agentUrl: string } | null>(null)
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null)

  const handleDeploySuccess = (agentId: number, agentUrl: string) => {
    setDeploySuccess({ agentId, agentUrl })
    // Auto-redirect to dashboard after 3 seconds
    setTimeout(() => {
      setCurrentPage('dashboard')
      setDeploySuccess(null)
    }, 3000)
  }

  const handleViewBot = (agentId: number) => {
    setSelectedBotId(agentId)
    setCurrentPage('bot')
  }

  const handleBackToDashboard = () => {
    setSelectedBotId(null)
    setCurrentPage('dashboard')
  }

  const renderPage = () => {
    if (deploySuccess) {
      return (
        <div className="max-w-md mx-auto text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-success-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Bot Deployed Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Your bot <strong>{deploySuccess.agentId}</strong> has been deployed and will be available in 5-7 minutes.
          </p>
          {deploySuccess.agentUrl && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Bot URL:</p>
              <a
                href={deploySuccess.agentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700 text-sm break-all"
              >
                {deploySuccess.agentUrl}
              </a>
            </div>
          )}
          <p className="text-sm text-gray-500">
            Redirecting to dashboard in a few seconds...
          </p>
        </div>
      )
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onDeployNew={() => setCurrentPage('deploy')} onViewBot={handleViewBot} />
      case 'deploy':
        return <DeployBotForm onSuccess={handleDeploySuccess} />
      case 'bot':
        return selectedBotId ? (
          <BotPage agentId={selectedBotId} onBack={handleBackToDashboard} />
        ) : (
          <Dashboard onDeployNew={() => setCurrentPage('deploy')} onViewBot={handleViewBot} />
        )
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Settings</h2>
            <p className="text-gray-600">Settings page coming soon...</p>
          </div>
        )
      default:
        return <Dashboard onDeployNew={() => setCurrentPage('deploy')} onViewBot={handleViewBot} />
    }
  }

  return (
    <AuthProvider>
      <ProtectedRoute>
        <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
          {renderPage()}
        </Layout>
      </ProtectedRoute>
    </AuthProvider>
  )
}

export default App