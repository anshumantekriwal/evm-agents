import React from "react";
import type { BaseAgentDashboardProps } from "./AgentDashboardShared";
import { LoadingState, ErrorState } from "./AgentDashboardShared";
import "../AgentDashboard.css";

interface UndeployedAgentDashboardProps extends BaseAgentDashboardProps {
  deploymentDuration: string;
}

const UndeployedAgentDashboard: React.FC<UndeployedAgentDashboardProps> = ({
  agent,
  loading,
  error,
  deploymentStatus,
  deploymentProgress,
  deploymentDuration,
  isDeploymentInProgress,
  showDebugPanel,
  debugInfo,
  handleDeploy,
  setShowDebugPanel,
  onBack,
}) => {
  if (loading) {
    return <LoadingState />;
  }

  if (error || !agent) {
    return <ErrorState error={error} onBack={onBack} />;
  }

  const getDeploymentStatusIcon = () => {
    switch (deploymentStatus) {
      case "writing_code":
        return "✏️";
      case "creating_agent":
        return "⚙️";
      case "deploying_agent":
      case "creating_wallet":
        return "🚀";
      case "awaiting_deposit":
        return "💰";
      case "deployment_success":
        return "✨";
      case "error":
        return "❌";
      default:
        return "🤖";
    }
  };

  const getDeploymentStatusText = () => {
    switch (deploymentStatus) {
      case "writing_code":
        return "Writing Code";
      case "creating_agent":
        return "Creating Agent";
      case "deploying_agent":
      case "creating_wallet":
        return "Deploying";
      case "awaiting_deposit":
        return "Awaiting Deposit";
      case "deployment_success":
        return "Deployment Successful";
      case "error":
        return "Error";
      default:
        return "Ready to Deploy";
    }
  };

  const getDeploymentStagePrompt = () => {
    switch (deploymentStatus) {
      case "writing_code":
        return "AI is analyzing your configuration and generating optimized trading strategy code";
      case "creating_agent":
        return "Setting up your agent's infrastructure and configuration";
      case "deploying_agent":
        return "Deploying your agent to secure AWS infrastructure";
      case "creating_wallet":
        return "Creating a secure wallet for your agent's operations";
      case "awaiting_deposit":
        return "Waiting for initial funds to begin trading";
      case "error":
        return "An error occurred during deployment";
      default:
        return "Click Deploy to start the deployment process";
    }
  };

  const getCurrentStageNumber = () => {
    switch (deploymentStatus) {
      case "writing_code":
        return 1;
      case "creating_agent":
      case "deploying_agent":
        return 2;
      case "creating_wallet":
        return 3;
      case "awaiting_deposit":
        return 4;
      default:
        return 0;
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        {/* Hero Section */}
        <section className="hero-section glass-card">
          <div className="hero-content">
            <div className="hero-header">
              <h1 className="hero-title">{agent.name || "Unnamed Agent"}</h1>
              <div className="network-indicator">
                <img
                  src="https://coin-images.coingecko.com/coins/images/32440/large/polygon.png"
                  alt="Polygon"
                  className="network-icon"
                />
                <div className="status-indicator">
                  <div className="status-dot"></div>
                  <span className="status-text">
                    {getDeploymentStatusText()}
                  </span>
                </div>
              </div>
            </div>
            <p className="hero-subtitle">
              {agent.description || "No description available"}
            </p>

            <div className="hero-prompt">
              <h3>Trading Strategy</h3>
              <p>{agent.prompt || "No trading strategy specified"}</p>
            </div>

            <div className="hero-stats">
              <div className="hero-stat-item">
                <div className="hero-stat-label">Status</div>
                <div className="hero-stat-value">
                  {getDeploymentStatusText()}
                </div>
                {/* <div className="hero-stat-icon">
                  {getDeploymentStatusIcon()}
                </div> */}
              </div>
              <div className="hero-stat-item">
                <div className="hero-stat-label">Created</div>
                <div className="hero-stat-value">
                  {agent.created_at
                    ? new Date(agent.created_at).toLocaleDateString()
                    : "Unknown"}
                </div>
                {/* <div className="hero-stat-icon">📅</div> */}
              </div>
            </div>

            <div className="hero-actions">
              <button
                className="hero-btn primary"
                onClick={handleDeploy}
                disabled={agent.agent_deployed || isDeploymentInProgress}
              >
                <span className="btn-icon">🚀</span>
                <span className="btn-text">
                  {isDeploymentInProgress ? "Deploying..." : "Deploy Agent"}
                </span>
              </button>
              <button
                className="hero-btn secondary"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
              >
                <span className="btn-icon">🔧</span>
                <span className="btn-text">
                  {showDebugPanel ? "Hide Debug" : "Show Debug"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Deployment Process */}
        <section className="portfolio-section glass-card">
          <div className="portfolio-header">
            <div className="portfolio-title-section">
              <h2 className="portfolio-title">Deployment Process</h2>
              <p className="deployment-stage-prompt">
                {getDeploymentStagePrompt()}
              </p>
            </div>
          </div>

          <div className="deployment-steps-horizontal">
            <div
              className={`step ${
                getCurrentStageNumber() === 1 ? "active" : ""
              } ${getCurrentStageNumber() > 1 ? "completed" : ""}`}
            >
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Generate Agent Code</h4>
              </div>
            </div>
            <div
              className={`step ${
                getCurrentStageNumber() === 2 ? "active" : ""
              } ${getCurrentStageNumber() > 2 ? "completed" : ""}`}
            >
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Deploy to AWS</h4>
              </div>
            </div>
            <div
              className={`step ${
                getCurrentStageNumber() === 3 ? "active" : ""
              } ${getCurrentStageNumber() > 3 ? "completed" : ""}`}
            >
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Create Wallet</h4>
              </div>
            </div>
            <div
              className={`step ${
                getCurrentStageNumber() === 4 ? "active" : ""
              }`}
            >
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Start Trading</h4>
              </div>
            </div>
          </div>
        </section>

        {/* Agent Overview */}
        <section className="holdings-section glass-card">
          <div className="holdings-header">
            <h2 className="holdings-title">Agent Overview</h2>
          </div>
          <div className="holdings-grid">
            <div className="holding-item">
              <div className="holding-info">
                <div className="holding-details">
                  <h4>Agent ID</h4>
                  <span className="monospace">
                    {agent.id || "Not available"}
                  </span>
                </div>
              </div>
            </div>
            <div className="holding-item">
              <div className="holding-info">
                <div className="holding-details">
                  <h4>Owner Address</h4>
                  <span className="monospace">
                    {agent.owner_address || "Not set"}
                  </span>
                </div>
              </div>
            </div>
            <div className="holding-item">
              <div className="holding-info">
                <div className="holding-details">
                  <h4>Slippage Tolerance</h4>
                  <span>
                    {agent.slippage_tolerance
                      ? `${agent.slippage_tolerance}%`
                      : "Not specified"}
                  </span>
                </div>
              </div>
            </div>
            <div className="holding-item">
              <div className="holding-info">
                <div className="holding-details">
                  <h4>Gas Limit</h4>
                  <span>
                    {agent.gas_limit ? `${agent.gas_limit} GWEI` : "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Debug Panel */}
        {showDebugPanel && (
          <section className="glass-card">
            <div className="holdings-header">
              <h2 className="holdings-title">Debug Information</h2>
            </div>
            <div className="debug-info">
              <div className="debug-status">
                <span>Deployment Status: {deploymentStatus}</span>
                <span>Agent Status: Not Deployed</span>
              </div>
              <div className="debug-logs">
                <h4>Debug Logs:</h4>
                <div className="debug-log-container">
                  {debugInfo.map((log, index) => (
                    <div key={index} className="debug-log-entry">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Deployment Progress */}
        {(isDeploymentInProgress ||
          deploymentStatus === "deployment_success") && (
          <section className="glass-card deployment-card">
            <div className="deployment-progress">
              <div
                className={`deployment-status-header ${
                  deploymentStatus === "deployment_success"
                    ? "success-animation"
                    : ""
                }`}
              >
                <span className="deployment-status-icon">
                  {getDeploymentStatusIcon()}
                </span>
                <div className="deployment-status-info">
                  <h3>{getDeploymentStatusText()}</h3>
                  <p className="deployment-status-description">
                    {deploymentProgress}
                  </p>
                </div>
                <div className="deployment-timer">
                  <span className="timer-icon">⏱️</span>
                  <span className="timer-value">{deploymentDuration}</span>
                </div>
              </div>
              <div className="deployment-warning">
                <span className="warning-icon">⚠️</span>
                <p>
                  Please do not refresh or navigate away from this page during
                  deployment
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default UndeployedAgentDashboard;
