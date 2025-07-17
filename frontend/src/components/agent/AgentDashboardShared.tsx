import React from "react";
import { type Agent } from "../../config";
import {
  type DeploymentStatus,
  type AgentRuntimeStatus,
} from "./useAgentDashboard";

export interface BaseAgentDashboardProps {
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
  balances: any[];
  balancesLoading: boolean;
  balancesError: string | null;
  transactions: any[];
  transactionsLoading: boolean;
  transactionsError: string | null;
  refreshBalances: () => void;
  refreshTransactions: () => void;
  // Actions
  handleDeploy: () => void;
  startLogsWebSocket: () => void;
  setShowDebugPanel: (show: boolean) => void;
  onBack: () => void;
}

export const getStatusBadge = (
  deployed: boolean | null,
  deploymentStatus: DeploymentStatus
) => {
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

export const getAgentRuntimeStatusBadge = (
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
      return <span className="status-badge initializing">🔄 Initializing</span>;
    case "checking_balance":
      return <span className="status-badge checking">💰 Checking Balance</span>;
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
      return <span className="status-badge executing">⚡ Executing Trade</span>;
    case "trade_completed":
      return <span className="status-badge completed">✅ Trade Completed</span>;
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

export const getLogsConnectionStatusBadge = (logsConnectionStatus: string) => {
  switch (logsConnectionStatus) {
    case "connected":
      return <span className="status-badge connected">🟢 Connected</span>;
    case "error":
      return <span className="status-badge error">❌ Connection Error</span>;
    case "disconnected":
      return <span className="status-badge disconnected">🔴 Disconnected</span>;
    default:
      return <span className="status-badge unknown">⚪ Unknown</span>;
  }
};

export const getTransactionTypeBadge = (type: string) => {
  switch (type) {
    case "buy":
      return <span className="transaction-type-badge buy">📈 Buy</span>;
    case "sell":
      return <span className="transaction-type-badge sell">📉 Sell</span>;
    case "native":
      return <span className="transaction-type-badge native">💸 Transfer</span>;
    case "swap":
      return <span className="transaction-type-badge swap">🔄 Swap</span>;
    default:
      return <span className="transaction-type-badge unknown">❓ {type}</span>;
  }
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatTransactionDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const shortenHash = (hash: string) => {
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
};

export const AgentHeader: React.FC<{
  agent: Agent;
  deploymentStatus: DeploymentStatus;
  onBack: () => void;
}> = ({ agent, deploymentStatus, onBack }) => (
  <div className="agent-dashboard-header">
    <button onClick={onBack} className="back-btn">
      ← Back to Dashboard
    </button>
    <div className="agent-title">
      <h1>{agent.name || "Unnamed Agent"}</h1>
      {getStatusBadge(agent.agent_deployed, deploymentStatus)}
    </div>
  </div>
);

export const AgentOverview: React.FC<{
  agent: Agent;
}> = ({ agent }) => (
  <div className="agent-dashboard-card">
    <div className="agent-header2">
      {agent.image ? (
        <img
          src={agent.image}
          alt="Agent avatar"
          className="agent-dashboard-avatar"
        />
      ) : (
        <div className="agent-dashboard-avatar-placeholder">🤖</div>
      )}
      <div className="agent-info">
        <h2>{agent.name}</h2>
        <p className="agent-description">
          {agent.description || agent.prompt || "No description available"}
        </p>
      </div>
    </div>

    <div className="agent-stats">
      <div className="stat-group">
        <h3>Configuration</h3>
        <div className="stat-item">
          <span className="agent-dashboard-stat-label">Owner Address:</span>
          <span className="agent-dashboard-stat-value monospace">
            {agent.owner_address || "Not set"}
          </span>
        </div>
        <div className="stat-item">
          <span className="agent-dashboard-stat-label">
            Slippage Tolerance:
          </span>
          <span className="agent-dashboard-stat-value">
            {agent.slippage_tolerance
              ? `${agent.slippage_tolerance}%`
              : "Not set"}
          </span>
        </div>
        <div className="stat-item">
          <span className="agent-dashboard-stat-label">Gas Limit:</span>
          <span className="agent-dashboard-stat-value monospace">
            {agent.gas_limit || "Not set"}
          </span>
        </div>
        <div className="stat-item">
          <span className="agent-dashboard-stat-label">Supported Chains:</span>
          <div className="chains-list">
            {agent.selected_chains && agent.selected_chains.length > 0 ? (
              agent.selected_chains.map((chain, index) => (
                <span key={index} className="chain-badge">
                  {chain}
                </span>
              ))
            ) : (
              <span className="agent-dashboard-stat-value">None selected</span>
            )}
          </div>
        </div>
      </div>

      <div className="stat-group">
        <h3>Deployment</h3>
        <div className="stat-item">
          <span className="agent-dashboard-stat-label">Agent Wallet:</span>
          <span className="agent-dashboard-stat-value monospace">
            {agent.agent_wallet || "Not generated"}
          </span>
        </div>
        <div className="stat-item">
          <span className="agent-dashboard-stat-label">AWS Instance:</span>
          <span className="agent-dashboard-stat-value">
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
        <div className="stat-item">
          <span className="agent-dashboard-stat-label">Created:</span>
          <span className="agent-dashboard-stat-value">
            {formatDate(agent.created_at)}
          </span>
        </div>
        {agent.updated_at && (
          <div className="stat-item">
            <span className="agent-dashboard-stat-label">Last Updated:</span>
            <span className="agent-dashboard-stat-value">
              {formatDate(agent.updated_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const LoadingState: React.FC = () => (
  <div className="agent-dashboard">
    <div className="agent-dashboard-loading-state">
      <div className="agent-dashboard-loading-spinner"></div>
      <p>Loading agent details...</p>
    </div>
  </div>
);

export const ErrorState: React.FC<{
  error: string | null;
  onBack: () => void;
}> = ({ error, onBack }) => (
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
