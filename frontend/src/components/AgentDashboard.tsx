import { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase, type Agent } from "../lib/supabase";
import "./AgentDashboard.css";

interface AgentDashboardProps {
  agentId: number;
  onBack: () => void;
}

type DeploymentStatus =
  | "idle"
  | "writing_code"
  | "creating_agent"
  | "deploying_agent"
  | "creating_wallet"
  | "awaiting_deposit"
  | "deployed"
  | "error";

interface AgentStatusResponse {
  phase: string;
  walletAddress: string | null;
  polBalance: number;
  lastMessage: string;
  nextStep: string;
  trades: any[];
  error: string | null;
  isRunning: boolean;
  updatedAt: string;
}

interface AgentRuntimeStatus {
  phase: string;
  walletAddress: string | null;
  polBalance: number;
  lastMessage: string;
  nextStep: string;
  trades: any[];
  error: string | null;
  isRunning: boolean;
  updatedAt: string;
}

const AgentDashboard = ({ agentId, onBack }: AgentDashboardProps) => {
  const { user } = useAuth0();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] =
    useState<DeploymentStatus>("idle");
  const [deploymentProgress, setDeploymentProgress] = useState("");
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentRuntimeStatus, setAgentRuntimeStatus] =
    useState<AgentRuntimeStatus | null>(null);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannel = useRef<any>(null);

  useEffect(() => {
    fetchAgent();
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("evm-agents")
        .select("*")
        .eq("id", agentId)
        .eq("user_id", user?.email)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setAgent(data);

      // If agent is deployed, set deployment status to deployed and start listening for runtime status
      if (data.agent_aws && data.agent_deployed) {
        setDeploymentStatus("deployed");
        startRealtimeStatusListening();
      }
    } catch (err) {
      console.error("Error fetching agent:", err);
      setError("Failed to load agent details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!agent) return;

    try {
      setDeploymentStatus("writing_code");
      setDeploymentProgress("Generating agent code...");

      // Step 1: Generate code
      const codeResponse = await fetch("https://evm-agents.onrender.com/code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt:
            agent.prompt || agent.description || "Default trading strategy",
        }),
      });

      if (!codeResponse.ok) {
        throw new Error("Failed to generate code");
      }

      const codeData = await codeResponse.json();
      console.log("Generated code:", codeData);

      setDeploymentStatus("creating_agent");
      setDeploymentProgress("Creating agent deployment...");

      // Step 2: Deploy agent
      let baselineFunction = codeData.code;
      // Remove ```json``` ticks if present
      if (typeof baselineFunction === "string") {
        baselineFunction = baselineFunction.replace(/```json\n?|\n?```/g, "");
        try {
          baselineFunction = JSON.parse(baselineFunction);
        } catch (e) {
          // If it's not JSON, keep as string
        }
      }

      const deployResponse = await fetch("http://54.166.244.200/deploy-agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "Commune_dev1",
        },
        body: JSON.stringify({
          agentId: agent.id,
          ownerAddress: agent.owner_address,
          baselineFunction: baselineFunction,
        }),
      });

      if (!deployResponse.ok) {
        throw new Error("Failed to deploy agent");
      }

      const deployData = await deployResponse.json();
      console.log("Deploy response:", deployData);

      if (!deployData.agentUrl) {
        throw new Error("No agent URL returned from deployment");
      }

      setDeploymentStatus("deploying_agent");
      setDeploymentProgress("Deploying agent to AWS...");

      // Update agent with AWS URL
      const { error: updateError } = await supabase
        .from("evm-agents")
        .update({
          agent_aws: deployData.agentUrl,
          updated_at: new Date().toISOString(),
          agent_deployed: true,
        })
        .eq("id", agent.id);

      if (updateError) {
        console.error("Error updating agent with AWS URL:", updateError);
      } else {
        setAgent((prev) =>
          prev ? { ...prev, agent_aws: deployData.agentUrl } : null
        );
      }

      // Start checking deployment status
      startStatusChecking(deployData.agentUrl);
    } catch (err) {
      console.error("Deployment error:", err);
      setDeploymentStatus("error");
      setDeploymentProgress(
        `Deployment failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
      setError("Deployment failed. Please try again.");
    }
  };

  const startRealtimeStatusListening = () => {
    // Clean up any existing channel
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
    }

    // Create and subscribe to the agent-specific channel
    const channelName = `agent_${agentId}`;
    realtimeChannel.current = supabase
      .channel(channelName)
      .on("broadcast", { event: "status_update" }, (payload) => {
        console.log("Received status update:", payload);

        if (
          payload.payload?.agent_id === agentId.toString() &&
          payload.payload?.status
        ) {
          const status = payload.payload.status;

          // Update agent runtime status
          setAgentRuntimeStatus({
            phase: status.phase,
            walletAddress: status.walletAddress,
            polBalance: status.polBalance || 0,
            lastMessage: status.lastMessage,
            nextStep: status.nextStep,
            trades: status.trades || [],
            error: status.error,
            isRunning: status.isRunning,
            updatedAt: status.updatedAt,
          });

          // Update agent wallet address if not already set
          if (status.walletAddress && agent && !agent.agent_wallet) {
            updateAgentWalletInDatabase(status.walletAddress);
          }

          // Fetch logs periodically when agent is running
          if (status.isRunning && agent?.agent_aws) {
            fetchAgentLogs(agent.agent_aws);
          }
        }
      })
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log(`Successfully subscribed to ${channelName}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to channel");
        } else if (status === "TIMED_OUT") {
          console.error("Subscription timed out");
        }
      });
  };

  const updateAgentWalletInDatabase = async (walletAddress: string) => {
    try {
      const { error: updateError } = await supabase
        .from("evm-agents")
        .update({
          agent_wallet: walletAddress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId);

      if (updateError) {
        console.error("Error updating agent wallet:", updateError);
      } else {
        setAgent((prev) =>
          prev
            ? {
                ...prev,
                agent_wallet: walletAddress,
              }
            : null
        );
      }
    } catch (err) {
      console.error("Error updating agent wallet:", err);
    }
  };

  const updateAgentDeploymentStatus = async (
    walletAddress: string,
    agentUrl: string
  ) => {
    try {
      const { error: finalUpdateError } = await supabase
        .from("evm-agents")
        .update({
          agent_deployed: true,
          agent_wallet: walletAddress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId);

      if (finalUpdateError) {
        console.error("Error updating final agent status:", finalUpdateError);
      } else {
        setAgent((prev) =>
          prev
            ? {
                ...prev,
                agent_deployed: true,
                agent_wallet: walletAddress,
              }
            : null
        );
      }
    } catch (err) {
      console.error("Error updating agent deployment status:", err);
    }
  };

  const startStatusChecking = (agentUrl: string) => {
    setDeploymentStatus("creating_wallet");
    setDeploymentProgress("Creating wallet and initializing...");

    // Clear any existing interval
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    // Clean up any existing deployment channel
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
    }

    // Create and subscribe to the agent-specific channel for deployment status
    const channelName = `agent_${agentId}`;
    realtimeChannel.current = supabase
      .channel(channelName)
      .on("broadcast", { event: "status_update" }, (payload) => {
        console.log("Received deployment status update:", payload);

        if (
          payload.payload?.agent_id === agentId.toString() &&
          payload.payload?.status
        ) {
          const status = payload.payload.status;

          // Update progress based on phase during deployment
          if (status.phase === "initializing") {
            setDeploymentProgress("Agent initializing...");
          } else if (
            status.phase === "checking_balance" &&
            status.walletAddress
          ) {
            // Agent is ready! Deployment complete
            setDeploymentStatus("deployed");
            setDeploymentProgress("Agent deployed successfully!");

            // Update Supabase with final deployment info
            updateAgentDeploymentStatus(status.walletAddress, agentUrl);

            // Clean up the deployment channel
            if (realtimeChannel.current) {
              supabase.removeChannel(realtimeChannel.current);
              realtimeChannel.current = null;
            }

            // Restart realtime listening for runtime status
            startRealtimeStatusListening();

            // Start fetching logs
            fetchAgentLogs(agentUrl);
          }

          // Handle errors
          if (status.error) {
            setDeploymentStatus("error");
            setDeploymentProgress(`Agent error: ${status.error}`);
            if (realtimeChannel.current) {
              supabase.removeChannel(realtimeChannel.current);
              realtimeChannel.current = null;
            }
          }
        }
      })
      .subscribe((status) => {
        console.log("Deployment realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log(
            `Successfully subscribed to ${channelName} for deployment`
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to deployment channel");
        } else if (status === "TIMED_OUT") {
          console.error("Deployment subscription timed out");
        }
      });
  };

  const fetchAgentLogs = async (agentUrl: string) => {
    try {
      const logsResponse = await fetch(`https://${agentUrl}/logs`);
      if (logsResponse.ok) {
        const logsData = await logsResponse.text();
        setAgentLogs(logsData.split("\n").filter((line) => line.trim()));
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isDeploymentInProgress = [
    "writing_code",
    "creating_agent",
    "deploying_agent",
    "creating_wallet",
  ].includes(deploymentStatus);

  if (loading) {
    return (
      <div className="agent-dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
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

  return (
    <div className="agent-dashboard">
      <div className="dashboard-header">
        <button onClick={onBack} className="back-btn">
          ← Back to Dashboard
        </button>
        <div className="agent-title">
          <h1>{agent.name || "Unnamed Agent"}</h1>
          {getStatusBadge(agent.agent_deployed)}
        </div>
      </div>

      {isDeploymentInProgress && (
        <div className="deployment-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <p className="progress-text">{deploymentProgress}</p>
        </div>
      )}

      <div className="dashboard-content">
        <div className="agent-overview">
          <div className="agent-card">
            <div className="agent-header">
              {agent.image ? (
                <img
                  src={agent.image}
                  alt="Agent avatar"
                  className="agent-avatar"
                />
              ) : (
                <div className="agent-avatar-placeholder">🤖</div>
              )}
              <div className="agent-info">
                <h2>{agent.name}</h2>
                <p className="agent-description">
                  {agent.description ||
                    agent.prompt ||
                    "No description available"}
                </p>
              </div>
            </div>

            <div className="agent-stats">
              <div className="stat-group">
                <h3>Configuration</h3>
                <div className="stat-item">
                  <span className="stat-label">Owner Address:</span>
                  <span className="stat-value monospace">
                    {agent.owner_address || "Not set"}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Slippage Tolerance:</span>
                  <span className="stat-value">
                    {agent.slippage_tolerance
                      ? `${agent.slippage_tolerance}%`
                      : "Not set"}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Gas Limit:</span>
                  <span className="stat-value monospace">
                    {agent.gas_limit || "Not set"}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Supported Chains:</span>
                  <div className="chains-list">
                    {agent.selected_chains &&
                    agent.selected_chains.length > 0 ? (
                      agent.selected_chains.map((chain, index) => (
                        <span key={index} className="chain-badge">
                          {chain}
                        </span>
                      ))
                    ) : (
                      <span className="stat-value">None selected</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="stat-group">
                <h3>Deployment</h3>
                <div className="stat-item">
                  <span className="stat-label">Agent Wallet:</span>
                  <span className="stat-value monospace">
                    {agent.agent_wallet || "Not generated"}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">AWS Instance:</span>
                  <span className="stat-value">
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
                  <span className="stat-label">Created:</span>
                  <span className="stat-value">
                    {formatDate(agent.created_at)}
                  </span>
                </div>
                {agent.updated_at && (
                  <div className="stat-item">
                    <span className="stat-label">Last Updated:</span>
                    <span className="stat-value">
                      {formatDate(agent.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="agent-actions">
            <h3>Actions</h3>
            <div className="action-buttons">
              <button
                className="action-btn primary"
                onClick={handleDeploy}
                disabled={agent.agent_deployed || isDeploymentInProgress}
              >
                {isDeploymentInProgress ? "Deploying..." : "Deploy Agent"}
              </button>
              <button className="action-btn secondary">
                Edit Configuration
              </button>
              <button
                className="action-btn secondary"
                onClick={() =>
                  agent.agent_aws && fetchAgentLogs(agent.agent_aws)
                }
                disabled={!agent.agent_aws}
              >
                Refresh Logs
              </button>
              <button className="action-btn danger">Delete Agent</button>
            </div>
          </div>
        </div>

        {/* Agent Runtime Status Section */}
        {deploymentStatus === "deployed" && (
          <div className="agent-runtime-status">
            <h3>Agent Runtime Status</h3>
            <div className="runtime-status-card">
              <div className="status-header">
                {getAgentRuntimeStatusBadge(agentRuntimeStatus)}
                {agentRuntimeStatus?.isRunning && (
                  <span className="running-indicator">🟢 Running</span>
                )}
              </div>

              {agentRuntimeStatus ? (
                <div className="runtime-details">
                  <div className="runtime-info">
                    <div className="runtime-item">
                      <span className="runtime-label">Current Phase:</span>
                      <span className="runtime-value">
                        {agentRuntimeStatus.phase}
                      </span>
                    </div>
                    <div className="runtime-item">
                      <span className="runtime-label">Last Message:</span>
                      <span className="runtime-value">
                        {agentRuntimeStatus.lastMessage}
                      </span>
                    </div>
                    <div className="runtime-item">
                      <span className="runtime-label">Next Step:</span>
                      <span className="runtime-value">
                        {agentRuntimeStatus.nextStep}
                      </span>
                    </div>
                    <div className="runtime-item">
                      <span className="runtime-label">POL Balance:</span>
                      <span className="runtime-value">
                        {agentRuntimeStatus.polBalance.toFixed(6)} POL
                      </span>
                    </div>
                    <div className="runtime-item">
                      <span className="runtime-label">Last Update:</span>
                      <span className="runtime-value">
                        {formatDate(agentRuntimeStatus.updatedAt)}
                      </span>
                    </div>
                    {agentRuntimeStatus.trades &&
                      agentRuntimeStatus.trades.length > 0 && (
                        <div className="runtime-item">
                          <span className="runtime-label">Total Trades:</span>
                          <span className="runtime-value">
                            {agentRuntimeStatus.trades.length}
                          </span>
                        </div>
                      )}
                  </div>

                  {agentRuntimeStatus.error && (
                    <div className="runtime-error">
                      <span className="error-label">Error:</span>
                      <span className="error-message">
                        {agentRuntimeStatus.error}
                      </span>
                    </div>
                  )}

                  {agentRuntimeStatus.trades &&
                    agentRuntimeStatus.trades.length > 0 && (
                      <div className="recent-trades">
                        <h4>Recent Trades</h4>
                        {agentRuntimeStatus.trades
                          .slice(-5)
                          .map((trade, index) => (
                            <div key={index} className="trade-item">
                              <span className="trade-timestamp">
                                {formatDate(trade.timestamp)}
                              </span>
                              <span className="trade-type">{trade.type}</span>
                              <span className="trade-details">
                                {trade.details}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                </div>
              ) : (
                <div className="no-runtime-status">
                  <p>Waiting for agent runtime status...</p>
                  <p>
                    The agent may be initializing or connecting to the network.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="agent-activity">
          <h3>Agent Logs</h3>
          <div className="logs-container">
            {agentLogs.length > 0 ? (
              agentLogs.map((log, index) => (
                <div key={index} className="log-entry">
                  {log}
                </div>
              ))
            ) : (
              <div className="no-logs">
                {agent.agent_aws
                  ? "No logs available yet"
                  : "Deploy agent to view logs"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
