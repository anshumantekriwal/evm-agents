import { useState, useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { supabase, type Agent } from "../../config";

export type DeploymentStatus =
  | "idle"
  | "writing_code"
  | "creating_agent"
  | "deploying_agent"
  | "creating_wallet"
  | "awaiting_deposit"
  | "deployment_success"
  | "deployed"
  | "error";

export interface AgentStatusResponse {
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

export interface AgentRuntimeStatus {
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

export interface TokenBalance {
  chain: string;
  address: string;
  balance: string;
  denominatedBalance: string;
  decimals: number;
  type: "native" | "fungible";
  tokenAddress: string;
  symbol: string;
  name: string;
  logoURI: string | null;
  priceUSD: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  contract: string | null;
  hash: string;
  amount_usd: number;
  amount: number;
  block_number: number;
  type: string;
  blockchain: string;
  tx_cost: number;
  transaction: {
    hash: string;
    chainId: string;
    fees: string;
    feesUSD: number;
    date: string;
  };
  asset: {
    id: number;
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: number;
    circulatingSupply: number;
    price: number;
    liquidity: number;
    priceChange24hPercent: number;
    marketCapUSD: number;
    logo: string;
    nativeChainId: string;
    contract: string | null;
  };
}

interface LogEvent {
  eventId: string;
  ingestionTime: number;
  logStreamName: string;
  message: string;
  timestamp: number;
}

interface LogEntry {
  timestamp: number;
  message: string;
}

interface UseAgentDashboardProps {
  agentId: number;
}

export const useAgentDashboard = ({ agentId }: UseAgentDashboardProps) => {
  const { user } = useAuth0();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploymentStatus, setDeploymentStatus] =
    useState<DeploymentStatus>("idle");
  const [deploymentProgress, setDeploymentProgress] = useState("");
  const [deploymentStartTime, setDeploymentStartTime] = useState<number | null>(
    null
  );
  const [deploymentDuration, setDeploymentDuration] = useState<string>("00:00");
  const deploymentTimerInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [agentRuntimeStatus, setAgentRuntimeStatus] =
    useState<AgentRuntimeStatus | null>(null);
  const [logsConnectionStatus, setLogsConnectionStatus] =
    useState<string>("disconnected");
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null
  );
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const realtimeChannel = useRef<any>(null);
  const logsWebSocket = useRef<WebSocket | null>(null);

  // Helper function to add debug information
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  // Update timer function
  const updateDeploymentTimer = () => {
    if (!startTimeRef.current) return;

    const now = Date.now();
    const duration = now - startTimeRef.current;
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    setDeploymentDuration(
      `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`
    );
  };

  // Fetch balances for the agent's wallet
  const fetchBalances = async (walletAddress: string) => {
    setBalancesLoading(true);
    setBalancesError(null);
    try {
      // Mobula API endpoint for wallet balances on Polygon
      const response = await fetch(
        `https://api.mobula.io/api/1/wallet/portfolio?wallet=${walletAddress}&blockchains=137`,
        {
          headers: { accept: "application/json" },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch balances: ${response.statusText}`);
      }
      const data = await response.json();
      const assets = data?.data?.assets || [];
      // Flatten and filter balances for Polygon
      const balances: TokenBalance[] = [];
      for (const asset of assets) {
        if (!asset.token_balance || asset.token_balance <= 0) continue;
        for (const contractBalance of asset.contracts_balances || []) {
          const chainId = contractBalance.chainId?.toString();
          if (chainId !== "137" && chainId !== "evm:137") continue;
          const tokenAddress = contractBalance.address?.toLowerCase() || "";
          const isNativeToken =
            tokenAddress === "0x0000000000000000000000000000000000000000" ||
            tokenAddress === "0x0" ||
            tokenAddress === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
            !tokenAddress;
          const type = isNativeToken ? "native" : "fungible";
          balances.push({
            chain: "polygon-mainnet",
            address: walletAddress,
            balance: contractBalance.balance.toString(),
            denominatedBalance: contractBalance.balanceRaw,
            decimals: contractBalance.decimals || 18,
            type,
            tokenAddress: isNativeToken
              ? "0x0000000000000000000000000000000000000000"
              : contractBalance.address,
            symbol: asset.asset?.symbol || "Unknown",
            name: asset.asset?.name || "Unknown Token",
            logoURI: asset.asset?.logo || null,
            priceUSD: asset.price || 0,
          });
        }
      }
      setBalances(balances.filter((b) => parseFloat(b.balance) > 0));
    } catch (err: any) {
      setBalancesError(err.message || "Failed to fetch balances");
      setBalances([]);
    } finally {
      setBalancesLoading(false);
    }
  };

  // Fetch transactions for the agent's wallet
  const fetchTransactions = async (walletAddress: string) => {
    setTransactionsLoading(true);
    setTransactionsError(null);
    try {
      // Mobula API endpoint for wallet transactions on Polygon
      const response = await fetch(
        `https://api.mobula.io/api/1/wallet/transactions?wallet=${walletAddress}`,
        {
          headers: { accept: "application/json" },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }
      const data = await response.json();
      const transactions = data?.data?.transactions || [];
      setTransactions(transactions);
    } catch (err: any) {
      setTransactionsError(err.message || "Failed to fetch transactions");
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Fetch balances when agent is loaded and has a wallet address
  useEffect(() => {
    if (agent && agent.agent_wallet) {
      fetchBalances(agent.agent_wallet);
      fetchTransactions(agent.agent_wallet);
    }
  }, [agent?.agent_wallet]);

  useEffect(() => {
    fetchAgent();
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
      if (logsWebSocket.current) {
        logsWebSocket.current.close();
      }
      if (deploymentTimerInterval.current) {
        clearInterval(deploymentTimerInterval.current);
      }
      startTimeRef.current = null;
    };
  }, [agentId]);

  // Clean up timer when status changes to deployed or error
  useEffect(() => {
    if (deploymentStatus === "deployed" || deploymentStatus === "error") {
      if (deploymentTimerInterval.current) {
        clearInterval(deploymentTimerInterval.current);
      }
      startTimeRef.current = null;
    }
  }, [deploymentStatus]);

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
        startLogsWebSocket();
      }
    } catch (err) {
      console.error("Error fetching agent:", err);
      setError("Failed to load agent details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startLogsWebSocket = () => {
    console.log(`Starting logs WebSocket for agent ${agentId}`);

    // Close existing WebSocket if it exists
    if (logsWebSocket.current) {
      console.log("Closing existing logs WebSocket");
      logsWebSocket.current.close();
    }

    try {
      const wsUrl = `ws://54.166.244.200/logs-stream/${agentId}?apiKey=Commune_dev1&lines=1000`;
      console.log("Connecting to logs WebSocket:", wsUrl);

      logsWebSocket.current = new WebSocket(wsUrl);

      logsWebSocket.current.onopen = () => {
        console.log("Logs WebSocket connected successfully");
        setLogsConnectionStatus("connected");
      };

      logsWebSocket.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received logs data:", data.type);

          if (data.type === "initial") {
            // Handle initial batch of logs - events are nested under data.logs.events
            const events = data.logs?.events;
            if (events && events.length > 0) {
              console.log(`Received ${events.length} initial log events`);
              const initialLogs: LogEntry[] = events.map((event: LogEvent) => {
                // Strip ANSI escape codes for cleaner display
                const cleanMessage = event.message.replace(
                  /\u001b\[[0-9;]*m/g,
                  ""
                );
                return {
                  timestamp: event.timestamp,
                  message: `[${new Date(
                    event.timestamp
                  ).toLocaleTimeString()}] ${cleanMessage}`,
                };
              });

              // Sort by timestamp (newest first)
              initialLogs.sort(
                (a: LogEntry, b: LogEntry) => b.timestamp - a.timestamp
              );

              setAgentLogs(initialLogs.map((log: LogEntry) => log.message));
            }
          } else if (data.type === "update") {
            // Handle new log updates
            if (data.events && data.events.length > 0) {
              console.log(`Received ${data.events.length} new log events`);
              const newLogEntries: LogEntry[] = data.events.map(
                (event: LogEvent) => {
                  // Strip ANSI escape codes for cleaner display
                  const cleanMessage = event.message.replace(
                    /\u001b\[[0-9;]*m/g,
                    ""
                  );
                  return {
                    timestamp: event.timestamp,
                    message: `[${new Date(
                      event.timestamp
                    ).toLocaleTimeString()}] ${cleanMessage}`,
                  };
                }
              );

              // Sort new entries by timestamp (newest first)
              newLogEntries.sort(
                (a: LogEntry, b: LogEntry) => b.timestamp - a.timestamp
              );

              setAgentLogs((prevLogs) => {
                // Add new logs to the beginning to maintain newest-first order
                const updatedLogs = [
                  ...newLogEntries.map((log: LogEntry) => log.message),
                  ...prevLogs,
                ];
                // Keep only the last 1000 lines to prevent memory issues
                return updatedLogs.slice(0, 1000);
              });
            }
          }
        } catch (err) {
          console.log("Received plain text log:", event.data);
          // If it's not JSON, treat it as a plain log line
          setAgentLogs((prevLogs) => {
            const newLogs = [...prevLogs, event.data];
            return newLogs.slice(-1000);
          });
        }
      };

      logsWebSocket.current.onerror = (error) => {
        console.error("Logs WebSocket error:", error);
        setLogsConnectionStatus("error");
      };

      logsWebSocket.current.onclose = (event) => {
        console.log("Logs WebSocket closed:", event.code, event.reason);
        setLogsConnectionStatus("disconnected");

        // Attempt to reconnect after 5 seconds if it wasn't a manual close
        if (event.code !== 1000 && deploymentStatus === "deployed") {
          console.log("Attempting to reconnect logs WebSocket in 5 seconds");
          setTimeout(() => {
            if (deploymentStatus === "deployed") {
              console.log("Reconnecting logs WebSocket");
              startLogsWebSocket();
            }
          }, 5000);
        }
      };
    } catch (err) {
      console.error("Error creating logs WebSocket:", err);
      setLogsConnectionStatus("error");
    }
  };

  const handleDeploy = async () => {
    if (!agent) return;

    try {
      // Start the deployment timer
      startTimeRef.current = Date.now();
      setDeploymentStartTime(startTimeRef.current);

      // Clear any existing timer
      if (deploymentTimerInterval.current) {
        clearInterval(deploymentTimerInterval.current);
      }

      // Start a new timer that updates every second
      deploymentTimerInterval.current = setInterval(
        updateDeploymentTimer,
        1000
      );

      addDebugInfo("Starting deployment process");
      setDeploymentStatus("writing_code");
      setDeploymentProgress("Generating agent code...");

      // Step 1: Generate code
      addDebugInfo("Calling code generation API");
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
      addDebugInfo("Code generation successful");
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

      addDebugInfo("Calling deployment API");
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
      addDebugInfo(
        `Deployment API successful, agent URL: ${deployData.agentUrl}`
      );
      console.log("Deploy response:", deployData);

      if (!deployData.agentUrl) {
        throw new Error("No agent URL returned from deployment");
      }

      setDeploymentStatus("deploying_agent");
      setDeploymentProgress("Deploying agent to AWS...");

      // Update agent with AWS URL
      addDebugInfo("Updating agent record in database");
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
        addDebugInfo(`Database update error: ${updateError.message}`);
      } else {
        addDebugInfo("Database update successful");
        setAgent((prev) =>
          prev ? { ...prev, agent_aws: deployData.agentUrl } : null
        );
      }

      // Start checking deployment status
      addDebugInfo("Starting deployment status monitoring");
      startStatusChecking(deployData.agentUrl);
    } catch (err) {
      console.error("Deployment error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      addDebugInfo(`Deployment failed: ${errorMessage}`);
      setDeploymentStatus("error");
      setDeploymentProgress(`Deployment failed: ${errorMessage}`);
      setError("Deployment failed. Please try again.");

      // Clear timer on error
      if (deploymentTimerInterval.current) {
        clearInterval(deploymentTimerInterval.current);
      }
      startTimeRef.current = null;
    }
  };

  const startRealtimeStatusListening = () => {
    addDebugInfo("Starting realtime status listening");
    // Clean up any existing channel
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
    }

    // Create and subscribe to the agent-specific channel
    const channelName = `agent_${agentId}`;
    addDebugInfo(`Creating channel: ${channelName}`);
    realtimeChannel.current = supabase
      .channel(channelName)
      .on("broadcast", { event: "status_update" }, (payload) => {
        addDebugInfo("Received status update");
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
        }
      })
      .subscribe((status) => {
        addDebugInfo(`Channel status: ${status}`);
        console.log("Realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log(`Successfully subscribed to ${channelName}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to channel:", status);
          addDebugInfo("Channel error, retrying...");
          // Retry after a delay
          setTimeout(() => {
            console.log("Retrying channel subscription...");
            startRealtimeStatusListening();
          }, 3000);
        } else if (status === "TIMED_OUT") {
          console.error("Subscription timed out");
          addDebugInfo("Channel timeout, retrying...");
          // Retry after a delay
          setTimeout(() => {
            console.log("Retrying channel subscription...");
            startRealtimeStatusListening();
          }, 3000);
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
    _agentUrl: string
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
    addDebugInfo("Starting deployment status checking");
    setDeploymentStatus("creating_wallet");
    setDeploymentProgress(
      "Creating wallet and initializing... (This may take 5-7 minutes)"
    );

    // Clear any existing interval
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    // Clean up any existing deployment channel
    if (realtimeChannel.current) {
      supabase.removeChannel(realtimeChannel.current);
    }

    // Set up a timeout to prevent infinite waiting (8 minutes for 5-7 minute deployment)
    const deploymentTimeout = setTimeout(() => {
      addDebugInfo("Deployment timeout reached, switching to polling");
      console.log("Deployment timeout reached, switching to polling mode");
      setDeploymentProgress("Taking longer than expected, checking status...");
      startPollingForDeploymentStatus(agentUrl);
    }, 480000); // 8 minutes timeout

    // Create and subscribe to the agent-specific channel for deployment status
    const channelName = `agent_${agentId}`;
    addDebugInfo(`Creating channel: ${channelName}`);
    realtimeChannel.current = supabase
      .channel(channelName)
      .on("broadcast", { event: "status_update" }, (payload) => {
        addDebugInfo("Received deployment status update");
        console.log("Received deployment status update:", payload);

        if (
          payload.payload?.agent_id === agentId.toString() &&
          payload.payload?.status
        ) {
          const status = payload.payload.status;

          // Update progress based on phase during deployment
          if (status.phase === "initializing") {
            addDebugInfo("Agent initializing");
            setDeploymentProgress(
              "Agent initializing... (This may take several minutes)"
            );
          } else if (
            status.phase === "checking_balance" &&
            status.walletAddress
          ) {
            // Agent is ready! Show success animation before completing deployment
            addDebugInfo("Deployment complete - showing success animation");
            setDeploymentStatus("deployment_success");
            setDeploymentProgress("Deployment successful!");

            // After animation duration, complete the deployment
            setTimeout(() => {
              addDebugInfo("Transitioning to deployed state");
              setDeploymentStatus("deployed");

              // Update Supabase with final deployment info
              updateAgentDeploymentStatus(status.walletAddress, agentUrl);

              // Clean up the deployment channel
              if (realtimeChannel.current) {
                supabase.removeChannel(realtimeChannel.current);
                realtimeChannel.current = null;
              }

              // Wait a moment before starting runtime listening to avoid conflicts
              setTimeout(() => {
                startRealtimeStatusListening();
                startLogsWebSocket();
              }, 1000);
            }, 3000); // Show success animation for 3 seconds
          }

          // Handle errors
          if (status.error) {
            addDebugInfo(`Deployment error: ${status.error}`);
            clearTimeout(deploymentTimeout);
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
        addDebugInfo(`Channel status: ${status}`);
        console.log("Deployment realtime subscription status:", status);
        if (status === "SUBSCRIBED") {
          console.log(
            `Successfully subscribed to ${channelName} for deployment`
          );
        } else if (status === "CHANNEL_ERROR") {
          console.error("Error subscribing to deployment channel:", status);
          addDebugInfo("Channel error, switching to polling");
          clearTimeout(deploymentTimeout);
          setDeploymentProgress(
            "Connection error - switching to polling mode (5-7 minutes expected)"
          );

          // Clean up the channel
          if (realtimeChannel.current) {
            supabase.removeChannel(realtimeChannel.current);
            realtimeChannel.current = null;
          }

          // Switch to polling mode as fallback
          setTimeout(() => {
            console.log("Switching to polling mode due to channel error");
            startPollingForDeploymentStatus(agentUrl);
          }, 1000);
        } else if (status === "TIMED_OUT") {
          console.error("Deployment subscription timed out");
          addDebugInfo("Channel timeout, switching to polling");
          clearTimeout(deploymentTimeout);
          setDeploymentProgress(
            "Connection timeout - switching to polling mode (5-7 minutes expected)"
          );

          // Clean up the channel
          if (realtimeChannel.current) {
            supabase.removeChannel(realtimeChannel.current);
            realtimeChannel.current = null;
          }

          // Switch to polling mode as fallback
          setTimeout(() => {
            console.log("Switching to polling mode due to timeout");
            startPollingForDeploymentStatus(agentUrl);
          }, 1000);
        }
      });
  };

  // Fallback polling mechanism
  const startPollingForDeploymentStatus = (_agentUrl: string) => {
    addDebugInfo("Starting polling for deployment status");
    setDeploymentProgress(
      "Checking deployment status... (Deployment typically takes 5-7 minutes)"
    );

    statusCheckInterval.current = setInterval(async () => {
      try {
        addDebugInfo("Polling database for deployment status");
        // Check if agent is deployed by querying the database
        const { data: agentData, error: agentError } = await supabase
          .from("evm-agents")
          .select("agent_deployed, agent_wallet")
          .eq("id", agentId)
          .single();

        if (agentError) {
          console.error("Error checking agent status:", agentError);
          addDebugInfo(`Database query error: ${agentError.message}`);
          return;
        }

        // If agent is deployed, finish the deployment process
        if (agentData.agent_deployed && agentData.agent_wallet) {
          addDebugInfo("Polling found agent deployed successfully");
          if (statusCheckInterval.current) {
            clearInterval(statusCheckInterval.current);
          }

          setDeploymentStatus("deployed");
          setDeploymentProgress("Agent deployed successfully!");

          // Start runtime listening and logs
          setTimeout(() => {
            startRealtimeStatusListening();
            startLogsWebSocket();
          }, 1000);
        } else {
          addDebugInfo("Agent not yet deployed, continuing to poll");
        }
      } catch (error) {
        console.error("Error in polling deployment status:", error);
        addDebugInfo(`Polling error: ${error}`);
      }
    }, 10000); // Check every 10 seconds (less frequent for longer deployment)

    // Stop polling after 15 minutes
    setTimeout(() => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
      addDebugInfo("Polling timeout reached");
      setDeploymentStatus("error");
      setDeploymentProgress(
        "Deployment timed out - please check your agent status"
      );
    }, 900000); // 15 minutes
  };

  const isDeploymentInProgress = [
    "writing_code",
    "creating_agent",
    "deploying_agent",
    "creating_wallet",
  ].includes(deploymentStatus);

  return {
    // State
    agent,
    loading,
    error,
    deploymentStatus,
    deploymentProgress,
    deploymentDuration,
    agentLogs,
    agentRuntimeStatus,
    logsConnectionStatus,
    showDebugPanel,
    debugInfo,
    isDeploymentInProgress,
    balances,
    balancesLoading,
    balancesError,
    transactions,
    transactionsLoading,
    transactionsError,
    // Actions
    handleDeploy,
    startLogsWebSocket,
    setShowDebugPanel,
    setError,
    fetchAgent,
    refreshBalances: () =>
      agent && agent.agent_wallet && fetchBalances(agent.agent_wallet),
    refreshTransactions: () =>
      agent && agent.agent_wallet && fetchTransactions(agent.agent_wallet),
  };
};
