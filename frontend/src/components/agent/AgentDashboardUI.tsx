import React, { useState } from "react";
import { type Agent } from "../../config";
import {
  type DeploymentStatus,
  type AgentRuntimeStatus,
} from "./useAgentDashboard";
import "../AgentDashboard.css";

interface AgentDashboardUIProps {
  // Props from the custom hook
  agent: Agent | null;
  loading: boolean;
  error: string | null;
  deploymentStatus: DeploymentStatus;
  deploymentProgress: string;
  agentLogs: string[];
  agentRuntimeStatus: AgentRuntimeStatus | null;
  logsConnectionStatus: string;
  showDebugPanel: boolean;
  debugInfo: string[];
  isDeploymentInProgress: boolean;

  // Actions
  handleDeploy: () => void;
  startLogsWebSocket: () => void;
  setShowDebugPanel: (show: boolean) => void;
  onBack: () => void;
}

const AgentDashboardUI: React.FC<AgentDashboardUIProps> = ({
  agent,
  loading,
  error,
  deploymentStatus,
  deploymentProgress,
  agentLogs,
  agentRuntimeStatus,
  logsConnectionStatus,
  showDebugPanel,
  debugInfo,
  isDeploymentInProgress,
  handleDeploy,
  startLogsWebSocket,
  setShowDebugPanel,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"trading" | "config">("trading");

  const getStatusBadge = (deployed: boolean | null) => {
    if (deploymentStatus === "writing_code") {
      return <span className="status-badge writing">✏️ Writing Code</span>;
    } else if (deploymentStatus === "creating_agent") {
      return <span className="status-badge creating">⚙️ Creating Agent</span>;
    } else if (
      deploymentStatus === "deploying_agent" ||
      deploymentStatus === "creating_wallet"
    ) {
      return <span className="status-badge deploying">🚀 Deploying</span>;
    } else if (deploymentStatus === "awaiting_deposit") {
      return <span className="status-badge awaiting">💰 Awaiting Deposit</span>;
    } else if (deploymentStatus === "error") {
      return <span className="status-badge error">❌ Error</span>;
    } else if (deploymentStatus === "deployed") {
      return <span className="status-badge deployed">✅ Deployed</span>;
    } else if (deployed === true) {
      return <span className="status-badge deployed">✅ Deployed</span>;
    } else if (deployed === false) {
      return <span className="status-badge pending">🟡 Pending</span>;
    }
    return <span className="status-badge unknown">⚪ Unknown</span>;
  };

  const getAgentRuntimeStatusBadge = (
    runtimeStatus: AgentRuntimeStatus | null
  ) => {
    if (!runtimeStatus) {
      return <span className="status-badge unknown">⚪ No Status</span>;
    }

    if (runtimeStatus.error) {
      return <span className="status-badge error">❌ Error</span>;
    }

    switch (runtimeStatus.phase) {
      case "initializing":
        return (
          <span className="status-badge initializing">🔄 Initializing</span>
        );
      case "checking_balance":
        return (
          <span className="status-badge checking">💰 Checking Balance</span>
        );
      case "monitoring":
        return <span className="status-badge monitoring">👀 Monitoring</span>;
      case "analyzing_market":
        return (
          <span className="status-badge analyzing">📊 Analyzing Market</span>
        );
      case "calculating_strategy":
        return (
          <span className="status-badge calculating">
            🧠 Calculating Strategy
          </span>
        );
      case "executing_trade":
        return (
          <span className="status-badge executing">⚡ Executing Trade</span>
        );
      case "trade_completed":
        return (
          <span className="status-badge completed">✅ Trade Completed</span>
        );
      case "waiting":
        return <span className="status-badge waiting">⏳ Waiting</span>;
      case "withdrawing":
        return <span className="status-badge withdrawing">💸 Withdrawing</span>;
      case "withdrawal_complete":
        return (
          <span className="status-badge completed">✅ Withdrawal Complete</span>
        );
      default:
        return <span className="status-badge active">🟢 Active</span>;
    }
  };

  const getLogsConnectionStatusBadge = () => {
    switch (logsConnectionStatus) {
      case "connected":
        return <span className="status-badge connected">🟢 Connected</span>;
      case "error":
        return <span className="status-badge error">❌ Connection Error</span>;
      case "disconnected":
        return (
          <span className="status-badge disconnected">🔴 Disconnected</span>
        );
      default:
        return <span className="status-badge unknown">⚪ Unknown</span>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="agent-dashboard">
        <div className="agent-dashboard-loading-state">
          <div className="agent-dashboard-loading-spinner"></div>
          <p>Loading agent details...</p>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="agent-dashboard">
        <div className="error-state">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={onBack} className="back-btn">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isDeployed =
    agent.agent_deployed === true || deploymentStatus === "deployed";

  return (
    <div className="agent-dashboard">
      <div className="agent-dashboard-content">
        {/* Hero Section */}
        <section className="agent-hero-section glass-card">
          <div className="agent-hero-header">
            <button onClick={onBack} className="back-btn">
              ← Back to Dashboard
            </button>
          </div>

          <div className="agent-hero-content">
            <div className="agent-hero-info">
              <div className="agent-hero-avatar">
                {agent.image ? (
                  <img src={agent.image} alt="Agent avatar" />
                ) : (
                  <div className="agent-hero-avatar-placeholder">🤖</div>
                )}
              </div>

              <div className="agent-hero-details">
                <h1 className="agent-hero-title">
                  {agent.name || "Unnamed Agent"}
                </h1>
                <p className="agent-hero-subtitle">
                  {agent.description ||
                    agent.prompt ||
                    "No description available"}
                </p>
                <div className="agent-hero-status">
                  {getStatusBadge(agent.agent_deployed)}
                  {agentRuntimeStatus?.isRunning && (
                    <span className="running-indicator">🟢 Running</span>
                  )}
                </div>
              </div>
            </div>

            {/* Agent Stats */}
            <div className="agent-hero-stats">
              <div className="agent-hero-stat-item">
                <div className="agent-hero-stat-label">Wallet Balance</div>
                <div className="agent-hero-stat-value">
                  {agentRuntimeStatus?.polBalance?.toFixed(4) || "0.0000"} POL
                </div>
                <div className="agent-hero-stat-change positive">
                  {agent.agent_wallet ? "Active" : "Not Generated"}
                </div>
              </div>

              <div className="agent-hero-stat-item">
                <div className="agent-hero-stat-label">Total Trades</div>
                <div className="agent-hero-stat-value">
                  {agentRuntimeStatus?.trades?.length || 0}
                </div>
                <div className="agent-hero-stat-change positive">
                  {agentRuntimeStatus?.trades?.length ? "Active" : "No Trades"}
                </div>
              </div>

              <div className="agent-hero-stat-item">
                <div className="agent-hero-stat-label">Current Phase</div>
                <div className="agent-hero-stat-value">
                  {agentRuntimeStatus?.phase || "Idle"}
                </div>
                <div className="agent-hero-stat-change">
                  {agentRuntimeStatus?.lastMessage || "Waiting..."}
                </div>
              </div>
            </div>
          </div>

          {/* Deployment Progress */}
          {isDeploymentInProgress && (
            <div className="deployment-progress-section">
              <div className="deployment-progress-bar">
                <div className="progress-fill"></div>
              </div>
              <p className="deployment-progress-text">{deploymentProgress}</p>
            </div>
          )}
        </section>

        {/* Tab Navigation for Deployed Agents */}
        {isDeployed && (
          <section className="agent-tabs-section glass-card">
            <div className="agent-tabs-header">
              <div className="agent-tabs-nav">
                <button
                  className={`agent-tab ${
                    activeTab === "trading" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("trading")}
                >
                  Trading View
                </button>
                <button
                  className={`agent-tab ${
                    activeTab === "config" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("config")}
                >
                  Configuration
                </button>
              </div>
            </div>

            {/* Trading View Tab */}
            {activeTab === "trading" && (
              <div className="agent-tab-content">
                {/* Runtime Status */}
                <div className="agent-runtime-status-section">
                  <div className="agent-runtime-status-header">
                    <h3>Runtime Status</h3>
                    {getAgentRuntimeStatusBadge(agentRuntimeStatus)}
                  </div>

                  <div className="agent-runtime-status-grid">
                    <div className="runtime-status-item">
                      <span className="runtime-status-label">
                        Current Phase
                      </span>
                      <span className="runtime-status-value">
                        {agentRuntimeStatus?.phase || "Unknown"}
                      </span>
                    </div>

                    <div className="runtime-status-item">
                      <span className="runtime-status-label">Last Message</span>
                      <span className="runtime-status-value">
                        {agentRuntimeStatus?.lastMessage || "No message"}
                      </span>
                    </div>

                    <div className="runtime-status-item">
                      <span className="runtime-status-label">Next Step</span>
                      <span className="runtime-status-value">
                        {agentRuntimeStatus?.nextStep || "Waiting"}
                      </span>
                    </div>

                    <div className="runtime-status-item">
                      <span className="runtime-status-label">Last Update</span>
                      <span className="runtime-status-value">
                        {agentRuntimeStatus?.updatedAt
                          ? formatDate(agentRuntimeStatus.updatedAt)
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  {agentRuntimeStatus?.error && (
                    <div className="runtime-error-section">
                      <h4>Runtime Error</h4>
                      <p className="runtime-error-message">
                        {agentRuntimeStatus.error}
                      </p>
                    </div>
                  )}
                </div>

                {/* Recent Trades */}
                {agentRuntimeStatus?.trades &&
                  agentRuntimeStatus.trades.length > 0 && (
                    <div className="agent-trades-section">
                      <h3>Recent Trades</h3>
                      <div className="agent-trades-list">
                        {agentRuntimeStatus.trades
                          .slice(-5)
                          .map((trade, index) => (
                            <div key={index} className="agent-trade-item">
                              <div className="trade-info">
                                <div className="trade-type">{trade.type}</div>
                                <div className="trade-details">
                                  {trade.details}
                                </div>
                              </div>
                              <div className="trade-timestamp">
                                {formatDate(trade.timestamp)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {/* Agent Logs */}
                <div className="agent-logs-section">
                  <div className="agent-logs-header">
                    <h3>Agent Logs</h3>
                    <div className="logs-actions">
                      {getLogsConnectionStatusBadge()}
                      <button
                        className="logs-reconnect-btn"
                        onClick={startLogsWebSocket}
                        disabled={!agent.agent_deployed}
                      >
                        Reconnect
                      </button>
                    </div>
                  </div>

                  <div className="agent-logs-container">
                    {agentLogs.length > 0 ? (
                      agentLogs.map((log, index) => (
                        <div key={index} className="agent-log-entry">
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="agent-no-logs">
                        {agent.agent_deployed
                          ? logsConnectionStatus === "connected"
                            ? "Waiting for logs..."
                            : "No logs available - check connection status"
                          : "Deploy agent to view logs"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Tab */}
            {activeTab === "config" && (
              <div className="agent-tab-content">
                {/* Agent Configuration */}
                <div className="agent-config-section">
                  <h3>Agent Configuration</h3>

                  <div className="agent-config-grid">
                    <div className="config-group">
                      <h4>Basic Information</h4>
                      <div className="config-items">
                        <div className="config-item">
                          <span className="config-label">Name</span>
                          <span className="config-value">
                            {agent.name || "Unnamed Agent"}
                          </span>
                        </div>
                        <div className="config-item">
                          <span className="config-label">Description</span>
                          <span className="config-value">
                            {agent.description ||
                              agent.prompt ||
                              "No description"}
                          </span>
                        </div>
                        <div className="config-item">
                          <span className="config-label">Created</span>
                          <span className="config-value">
                            {formatDate(agent.created_at)}
                          </span>
                        </div>
                        {agent.updated_at && (
                          <div className="config-item">
                            <span className="config-label">Last Updated</span>
                            <span className="config-value">
                              {formatDate(agent.updated_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="config-group">
                      <h4>Trading Settings</h4>
                      <div className="config-items">
                        <div className="config-item">
                          <span className="config-label">
                            Slippage Tolerance
                          </span>
                          <span className="config-value">
                            {agent.slippage_tolerance
                              ? `${agent.slippage_tolerance}%`
                              : "Not set"}
                          </span>
                        </div>
                        <div className="config-item">
                          <span className="config-label">Gas Limit</span>
                          <span className="config-value monospace">
                            {agent.gas_limit || "Not set"}
                          </span>
                        </div>
                        <div className="config-item">
                          <span className="config-label">Owner Address</span>
                          <span className="config-value monospace">
                            {agent.owner_address || "Not set"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="config-group">
                      <h4>Deployment</h4>
                      <div className="config-items">
                        <div className="config-item">
                          <span className="config-label">Agent Wallet</span>
                          <span className="config-value monospace">
                            {agent.agent_wallet || "Not generated"}
                          </span>
                        </div>
                        <div className="config-item">
                          <span className="config-label">AWS Instance</span>
                          <span className="config-value">
                            {agent.agent_aws ? (
                              <a
                                href={"https://" + agent.agent_aws}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="aws-link"
                              >
                                View Instance ↗
                              </a>
                            ) : (
                              "Not deployed"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="config-group">
                      <h4>Supported Chains</h4>
                      <div className="config-chains">
                        {agent.selected_chains &&
                        agent.selected_chains.length > 0 ? (
                          agent.selected_chains.map((chain, index) => (
                            <span key={index} className="config-chain-badge">
                              {chain}
                            </span>
                          ))
                        ) : (
                          <span className="config-value">None selected</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Agent Actions */}
                <div className="agent-actions-section">
                  <h3>Actions</h3>
                  <div className="agent-actions-grid">
                    <button className="agent-action-btn secondary">
                      Edit Configuration
                    </button>
                    <button
                      className="agent-action-btn secondary"
                      onClick={() => setShowDebugPanel(!showDebugPanel)}
                    >
                      {showDebugPanel ? "Hide Debug" : "Show Debug"}
                    </button>
                    <button className="agent-action-btn danger">
                      Delete Agent
                    </button>
                  </div>
                </div>

                {/* Debug Panel */}
                {showDebugPanel && (
                  <div className="agent-debug-section">
                    <h3>Debug Information</h3>
                    <div className="debug-status-grid">
                      <div className="debug-status-item">
                        <span>Deployment Status:</span>
                        <span>{deploymentStatus}</span>
                      </div>
                      <div className="debug-status-item">
                        <span>Logs Connection:</span>
                        <span>{logsConnectionStatus}</span>
                      </div>
                    </div>

                    <div className="debug-logs-section">
                      <h4>Debug Logs</h4>
                      <div className="debug-logs-container">
                        {debugInfo.map((log, index) => (
                          <div key={index} className="debug-log-entry">
                            {log}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Non-deployed Agent Actions */}
        {!isDeployed && (
          <>
            <section className="agent-deploy-section glass-card">
              <div className="agent-deploy-content">
                <h3>Deploy Your Agent</h3>
                <p>
                  Your agent is ready to be deployed. Click the button below to
                  start the deployment process.
                </p>

                <div className="agent-deploy-actions">
                  <button
                    className="agent-deploy-btn primary"
                    onClick={handleDeploy}
                    disabled={isDeploymentInProgress}
                  >
                    {isDeploymentInProgress ? "Deploying..." : "Deploy Agent"}
                  </button>

                  <button className="agent-deploy-btn secondary">
                    Edit Configuration
                  </button>

                  <button
                    className="agent-deploy-btn secondary"
                    onClick={() => setShowDebugPanel(!showDebugPanel)}
                  >
                    {showDebugPanel ? "Hide Debug" : "Show Debug"}
                  </button>
                </div>
              </div>
            </section>

            {/* Debug Panel for Non-deployed Agents */}
            {showDebugPanel && (
              <section className="agent-debug-section glass-card">
                <h3>Debug Information</h3>
                <div className="debug-status-grid">
                  <div className="debug-status-item">
                    <span>Deployment Status:</span>
                    <span>{deploymentStatus}</span>
                  </div>
                  <div className="debug-status-item">
                    <span>Logs Connection:</span>
                    <span>{logsConnectionStatus}</span>
                  </div>
                  <div className="debug-status-item">
                    <span>Agent Deployed:</span>
                    <span>{agent.agent_deployed ? "Yes" : "No"}</span>
                  </div>
                  <div className="debug-status-item">
                    <span>Agent ID:</span>
                    <span>{agent.id}</span>
                  </div>
                </div>

                <div className="debug-logs-section">
                  <h4>Debug Logs</h4>
                  <div className="debug-logs-container">
                    {debugInfo.length > 0 ? (
                      debugInfo.map((log, index) => (
                        <div key={index} className="debug-log-entry">
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="debug-log-entry">
                        No debug information available yet. Debug logs will
                        appear here during deployment.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AgentDashboardUI;
