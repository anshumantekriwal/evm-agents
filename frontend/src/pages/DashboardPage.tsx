import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { supabase, type Agent } from "../config";
import "../components/Dashboard.css";

// Define types for token balances
interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  priceUSD: number;
  logoURI?: string;
}

interface AggregatedBalance {
  symbol: string;
  name: string;
  amount: number;
  value: number;
  change24h: string;
  isPositive: boolean;
  logo?: string;
}

interface AgentPortfolio {
  id: number;
  name: string;
  portfolioValue: number;
  change24h: string;
  isPositive: boolean;
  status: string;
  trades: number;
  wallet: string | null;
}

interface WalletBalance {
  total: number;
  change24h: number;
}

interface PortfolioHistoryPoint {
  timestamp: number;
  date: string;
  value: number;
}

export const DashboardPage = () => {
  const { user } = useAuth0();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holdingsTab, setHoldingsTab] = useState<"tokens" | "agents">("tokens");
  const [aggregatedBalances, setAggregatedBalances] = useState<
    AggregatedBalance[]
  >([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<
    Record<string, WalletBalance>
  >({});
  const [portfolioPerformanceData, setPortfolioPerformanceData] = useState<
    PortfolioHistoryPoint[]
  >([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Agent portfolio data
  const agentPortfolios: AgentPortfolio[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name || "Unnamed Agent",
    portfolioValue: 0, // This will be updated when we implement P/L tracking
    change24h: "0%",
    isPositive: true,
    status: agent.agent_deployed ? "Active" : "Pending",
    trades: 0, // This will be updated when we implement trade tracking
    wallet: agent.agent_wallet,
  }));

  // Calculate active agents and new agents in last 24 hours
  const getAgentStats = (agents: Agent[]) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const activeAgents = agents.filter(
      (agent) => agent.agent_deployed === true
    ).length;
    const newAgents = agents.filter((agent) => {
      const createdAt = new Date(agent.created_at);
      return createdAt >= twentyFourHoursAgo;
    }).length;

    return { activeAgents, newAgents };
  };

  // Fetch balances for a single agent
  const fetchAgentBalances = async (
    agentWallet: string
  ): Promise<TokenBalance[]> => {
    try {
      // Mobula API endpoint for wallet balances on Polygon
      const response = await fetch(
        `https://api.mobula.io/api/1/wallet/portfolio?wallet=${agentWallet}&blockchains=137`,
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
            symbol: asset.asset?.symbol || "Unknown",
            name: asset.asset?.name || "Unknown Token",
            balance: contractBalance.balance.toString(),
            priceUSD: asset.price || 0,
            logoURI: asset.asset?.logo || null,
          });
        }
      }
      return balances.filter((b) => parseFloat(b.balance) > 0);
    } catch (error) {
      console.error(`Error fetching balances for agent ${agentWallet}:`, error);
      return [];
    }
  };

  // Fetch and aggregate balances for all agents
  const fetchAllBalances = async () => {
    try {
      setBalancesLoading(true);
      setBalancesError(null);

      // Filter agents with wallet addresses
      const agentsWithWallets = agents.filter((agent) => agent.agent_wallet);

      // Fetch balances for all agents in parallel
      const balancesPromises = agentsWithWallets.map((agent) =>
        fetchAgentBalances(agent.agent_wallet!)
      );

      const allBalances = await Promise.all(balancesPromises);

      // Aggregate balances across all agents
      const aggregated: { [key: string]: AggregatedBalance } = {};

      allBalances.flat().forEach((balance) => {
        if (!aggregated[balance.symbol]) {
          aggregated[balance.symbol] = {
            symbol: balance.symbol,
            name: balance.name,
            amount: 0,
            value: 0,
            change24h: "0%", // We'll need to implement price change tracking
            isPositive: true,
            logo: balance.logoURI,
          };
        }

        const amount = parseFloat(balance.balance);
        const value = amount * balance.priceUSD;

        aggregated[balance.symbol].amount += amount;
        aggregated[balance.symbol].value += value;
      });

      setAggregatedBalances(Object.values(aggregated));
    } catch (error) {
      console.error("Error fetching all balances:", error);
      setBalancesError("Failed to fetch token balances");
    } finally {
      setBalancesLoading(false);
    }
  };

  // Fetch wallet balance for a single agent
  const fetchWalletBalance = async (
    agentWallet: string
  ): Promise<WalletBalance | null> => {
    try {
      const response = await fetch(
        `https://api.mobula.io/api/1/wallet/portfolio?wallet=${agentWallet}&blockchains=137`,
        {
          headers: { accept: "application/json" },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }
      const data = await response.json();
      const totalBalance = data?.data?.total_wallet_balance || 0;
      const change24h = data?.data?.assets?.[0]?.price_change_24h || 0;

      return {
        total: totalBalance,
        change24h: change24h,
      };
    } catch (error) {
      console.error(`Error fetching wallet balance for ${agentWallet}:`, error);
      return null;
    }
  };

  // Fetch wallet history for a single agent
  const fetchWalletHistory = async (
    agentWallet: string
  ): Promise<[number, number][]> => {
    try {
      const response = await fetch(
        `https://api.mobula.io/api/1/wallet/history?wallet=${agentWallet}`,
        {
          headers: { accept: "application/json" },
        }
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch wallet history: ${response.statusText}`
        );
      }
      const data = await response.json();
      return data?.data?.balance_history || [];
    } catch (error) {
      console.error(`Error fetching wallet history for ${agentWallet}:`, error);
      return [];
    }
  };

  // Fetch and aggregate portfolio performance data
  const fetchPortfolioPerformance = async () => {
    try {
      setPortfolioLoading(true);
      setPortfolioError(null);

      // Filter agents with wallet addresses
      const agentsWithWallets = agents.filter((agent) => agent.agent_wallet);

      if (agentsWithWallets.length === 0) {
        setPortfolioPerformanceData([]);
        return;
      }

      // Fetch wallet history for all agents in parallel
      const historyPromises = agentsWithWallets.map((agent) =>
        fetchWalletHistory(agent.agent_wallet!)
      );

      const allHistories = await Promise.all(historyPromises);

      // Get all unique timestamps from all histories
      const allTimestamps = new Set<number>();
      allHistories.forEach((history) => {
        history.forEach(([timestamp]) => {
          allTimestamps.add(timestamp);
        });
      });

      // Sort timestamps
      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

      // For each timestamp, calculate the total portfolio value
      const aggregatedHistory: PortfolioHistoryPoint[] = [];

      sortedTimestamps.forEach((timestamp) => {
        let totalValue = 0;

        // For each wallet, find the balance at this timestamp
        allHistories.forEach((history) => {
          // Find the most recent balance for this wallet at or before this timestamp
          let walletBalance = 0;
          for (let i = 0; i < history.length; i++) {
            const [historyTimestamp, balance] = history[i];
            if (historyTimestamp <= timestamp) {
              walletBalance = balance;
            } else {
              break;
            }
          }
          totalValue += walletBalance;
        });

        aggregatedHistory.push({
          timestamp,
          date: new Date(timestamp).toISOString(),
          value: totalValue,
        });
      });

      setPortfolioPerformanceData(aggregatedHistory);
    } catch (error) {
      console.error("Error fetching portfolio performance:", error);
      setPortfolioError("Failed to fetch portfolio performance data");
    } finally {
      setPortfolioLoading(false);
    }
  };

  // Fetch all wallet balances
  const fetchAllWalletBalances = async () => {
    const agentsWithWallets = agents.filter((agent) => agent.agent_wallet);
    const balances: Record<string, WalletBalance> = {};

    await Promise.all(
      agentsWithWallets.map(async (agent) => {
        if (agent.agent_wallet) {
          const balance = await fetchWalletBalance(agent.agent_wallet);
          if (balance) {
            balances[agent.agent_wallet] = balance;
          }
        }
      })
    );

    setWalletBalances(balances);
  };

  // Portfolio stats with dynamic agent data and total value
  const getPortfolioStats = () => {
    const { activeAgents, newAgents } = getAgentStats(agents);
    const totalValue =
      portfolioPerformanceData.length > 0
        ? portfolioPerformanceData[portfolioPerformanceData.length - 1].value
        : aggregatedBalances.reduce((sum, bal) => sum + bal.value, 0);

    // Calculate 24h change from portfolio performance data
    const change24h =
      portfolioPerformanceData.length > 1
        ? ((portfolioPerformanceData[portfolioPerformanceData.length - 1]
            .value -
            portfolioPerformanceData[portfolioPerformanceData.length - 2]
              .value) /
            portfolioPerformanceData[portfolioPerformanceData.length - 2]
              .value) *
          100
        : 0;

    return [
      {
        label: "Total Value Locked",
        value: `$${totalValue.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
        change: `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`,
        isPositive: change24h >= 0,
      },
      {
        label: "Active Agents",
        value: activeAgents.toString(),
        change: newAgents > 0 ? `+${newAgents}` : "0",
        isPositive: newAgents > 0,
      },
      {
        label: "Total Profit/Loss",
        value: "$1,890.00", // We'll need to implement P/L tracking
        change: "+8.3%",
        isPositive: true,
      },
    ];
  };

  useEffect(() => {
    if (user?.email) {
      fetchUserAgents();
    }
  }, [user?.email]);

  useEffect(() => {
    if (agents.length > 0) {
      fetchAllBalances();
      fetchAllWalletBalances();
      fetchPortfolioPerformance();
    }
  }, [agents]);

  const fetchUserAgents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("evm-agents")
        .select("*")
        .eq("user_id", user?.email)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setAgents(data || []);
    } catch (err) {
      console.error("Error fetching agents:", err);
      setError("Failed to load your agents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (deployed: boolean | null) => {
    if (deployed === true) return "#4ade80"; // green for deployed
    if (deployed === false) return "#f59e0b"; // orange for not deployed
    return "#6b7280"; // gray for unknown
  };

  // Update the holdingsData reference in the JSX to use aggregatedBalances
  const getHoldingsData = () => {
    if (balancesLoading) return [];
    return aggregatedBalances.map((balance) => ({
      symbol: balance.symbol,
      name: balance.name,
      amount: balance.amount,
      value: balance.value,
      change24h: balance.change24h,
      isPositive: balance.isPositive,
      logo:
        balance.logo ||
        `https://coin-images.coingecko.com/coins/images/279/large/${balance.symbol.toLowerCase()}.png`,
    }));
  };

  // Update agent portfolios to use real wallet balances
  const getAgentPortfolios = (): AgentPortfolio[] => {
    return agents.map((agent) => {
      const walletBalance = agent.agent_wallet
        ? walletBalances[agent.agent_wallet]
        : null;
      return {
        id: agent.id,
        name: agent.name || "Unnamed Agent",
        portfolioValue: walletBalance?.total || 0,
        change24h: walletBalance
          ? `${(walletBalance.change24h * 100).toFixed(2)}%`
          : "0%",
        isPositive: walletBalance ? walletBalance.change24h > 0 : true,
        status: agent.agent_deployed ? "Active" : "Pending",
        trades: 0, // This will be updated when we implement trade tracking
        wallet: agent.agent_wallet,
      };
    });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        {/* Hero Section */}
        <section className="hero-section glass-card">
          <div className="hero-content">
            <h1 className="hero-title">
              Welcome back, {user?.name?.split(" ")[0] || "Trader"}
            </h1>
            <p className="hero-subtitle">
              Your AI-powered trading command center. Monitor, deploy, and
              optimize your autonomous agents.
            </p>

            {/* Integrated Stats */}
            <div className="hero-stats">
              {getPortfolioStats().map((stat, index) => (
                <div key={index} className="hero-stat-item">
                  <div className="hero-stat-label">{stat.label}</div>
                  <div className="hero-stat-value">{stat.value}</div>
                  <div
                    className={`hero-stat-change ${
                      stat.isPositive ? "positive" : "negative"
                    }`}
                  >
                    {stat.change}
                  </div>
                </div>
              ))}
            </div>

            {/* <div className="hero-actions">
              <Link to="/create-agent" className="hero-btn">
                ⚡ Deploy New Agent
              </Link>
            </div> */}
          </div>
        </section>

        {/* Portfolio Section */}
        <section className="portfolio-section glass-card">
          <div className="portfolio-header">
            <div className="portfolio-title-section">
              <h2 className="portfolio-title">PORTFOLIO PERFORMANCE</h2>
              <div className="portfolio-value">
                {portfolioLoading
                  ? "Loading..."
                  : portfolioError
                  ? "Error"
                  : portfolioPerformanceData.length > 0
                  ? `$${portfolioPerformanceData[
                      portfolioPerformanceData.length - 1
                    ].value.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}`
                  : "$0.00"}
              </div>
            </div>
          </div>

          <div className="chart-container">
            {portfolioLoading ? (
              <div className="loading-state">Loading portfolio data...</div>
            ) : portfolioError ? (
              <div className="error-state">
                {portfolioError}
                <button
                  onClick={fetchPortfolioPerformance}  
                  className="retry-btn"
                >
                  Retry
                </button>
              </div>
            ) : portfolioPerformanceData.length === 0 ? (
              <div className="empty-state">No portfolio data available</div>
            ) : (
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioPerformanceData}>
                    <defs>
                      <linearGradient
                        id="portfolioGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#1B8E2D"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="50%"
                          stopColor="#1B8E2D"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="100%"
                          stopColor="#1B8E2D"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <XAxis
                      dataKey="timestamp"
                      stroke="rgba(255, 255, 255, 0.4)"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      }
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(20, 20, 20, 0.95)",
                        border: "1px solid rgba(80, 80, 80, 0.4)",
                        borderRadius: "12px",
                        color: "#fff",
                        backdropFilter: "blur(20px)",
                        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
                        fontSize: "14px",
                      }}
                      formatter={(value: any) => [`$${value.toLocaleString()}`]}
                      labelFormatter={(label) =>
                        new Date(Number(label)).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      }
                      cursor={{
                        strokeWidth: 0,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#00ff88"
                      strokeWidth={2}
                      fill="url(#portfolioGradient)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "#00ff88",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Holdings Section */}
        <section className="holdings-section glass-card">
          <div className="holdings-header">
            <h2 className="holdings-title">Holdings</h2>

            {/* Holdings Tab Navigation */}
            <div className="holdings-tabs">
              <button
                className={`holdings-tab ${
                  holdingsTab === "tokens" ? "active" : ""
                }`}
                onClick={() => setHoldingsTab("tokens")}
              >
                Tokens
              </button>
              <button
                className={`holdings-tab ${
                  holdingsTab === "agents" ? "active" : ""
                }`}
                onClick={() => setHoldingsTab("agents")}
              >
                Agents
              </button>
            </div>

            <span className="total-holdings-value">
              {holdingsTab === "tokens"
                ? `$${aggregatedBalances
                    .reduce((sum, holding) => sum + holding.value, 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                : `$${getAgentPortfolios()
                    .reduce((sum, agent) => sum + agent.portfolioValue, 0)
                    .toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            </span>
          </div>

          <div className="holdings-list">
            {holdingsTab === "tokens" ? (
              balancesLoading ? (
                <div className="loading-state">Loading balances...</div>
              ) : balancesError ? (
                <div className="error-state">{balancesError}</div>
              ) : getHoldingsData().length > 0 ? (
                getHoldingsData().map((holding, index) => (
                  <div key={index} className="holding-item">
                    <div className="holding-info">
                      <img
                        src={holding.logo}
                        alt={holding.name}
                        className="holding-logo"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png";
                        }}
                      />
                      <div className="holding-details">
                        <h4>{holding.name}</h4>
                        <span>{holding.symbol}</span>
                      </div>
                    </div>
                    <div className="holding-value">
                      <div className="holding-amount">
                        {holding.amount.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}{" "}
                        {holding.symbol}
                      </div>
                      <div
                        className={`holding-change ${
                          holding.isPositive ? "positive" : "negative"
                        }`}
                      >
                        $
                        {holding.value.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        ({holding.change24h})
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No token holdings found</div>
              )
            ) : // Agents Tab Content with real wallet balances
            balancesLoading ? (
              <div className="loading-state">Loading agent balances...</div>
            ) : (
              getAgentPortfolios().map((agent) => (
                <div key={agent.id} className="holding-item">
                  <div className="holding-info">
                    <div className="agent-avatar-small">
                      {agent.name.charAt(0)}
                    </div>
                    <div className="holding-details">
                      <h4>{agent.name}</h4>
                      <span>
                        {agent.wallet
                          ? `${agent.wallet.slice(0, 6)}...${agent.wallet.slice(
                              -4
                            )}`
                          : "No wallet"}
                      </span>
                    </div>
                  </div>
                  <div className="holding-value">
                    <div className="holding-amount">
                      $
                      {agent.portfolioValue.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div
                      className={`holding-change ${
                        agent.isPositive ? "positive" : "negative"
                      }`}
                    >
                      {agent.change24h}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Agents Section */}
        <section className="agents-section glass-card">
          <div className="agents-header">
            <h2 className="agents-title">Your Agents</h2>
            <Link to="/create-agent" className="create-agent-btn">
              + Create Agent
            </Link>
          </div>

          {error && (
            <div className="dashboard-error-message">
              <p>{error}</p>
              <button onClick={fetchUserAgents} className="retry-btn">
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="dashboard-loading-state">
              <div className="dashboard-loading-spinner"></div>
              <p>Loading your agents...</p>
            </div>
          ) : (
            <div className="agents-grid">
              {agents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">🤖</div>
                  <h3>No agents deployed yet</h3>
                  <p>
                    Create your first autonomous trading agent to get started
                  </p>
                  <Link to="/create-agent" className="hero-btn">
                    Deploy Your First Agent
                  </Link>
                </div>
              ) : (
                agents.map((agent) => (
                  <div key={agent.id} className="agent-card">
                    <div className="agent-header">
                      <div className="agent-avatar">
                        {agent.name?.charAt(0) || "A"}
                      </div>

                      <div className="agent-info">
                        <h3 className="agent-name">
                          {agent.name || "Unnamed Agent"}
                        </h3>
                        <p className="agent-description">
                          {agent.description ||
                            agent.prompt ||
                            "No description available"}
                        </p>
                      </div>
                    </div>

                    <div className="agent-details">
                      <div className="agent-wallet">
                        {(agent as any).agent_wallet || "0x0000...0000"}
                      </div>

                      <div className="agent-prompt">
                        {(agent as any).prompt || "No prompt available"}
                      </div>

                      <div className="agent-chain">
                        <img
                          src="https://coin-images.coingecko.com/coins/images/32440/large/polygon.png"
                          alt="Polygon Logo"
                          style={{
                            width: "20px",
                            height: "20px",
                            verticalAlign: "middle",
                            marginRight: "0.5rem",
                          }}
                        />
                        Polygon Network
                      </div>

                      <Link
                        to={`/agent/${agent.id}`}
                        className="agent-manage-btn"
                      >
                        View & Manage
                      </Link>
                    </div>

                    <div
                      className={`agent-status-indicator ${
                        agent.agent_deployed === true
                          ? "active"
                          : agent.agent_deployed === false
                          ? "pending"
                          : "inactive"
                      }`}
                    ></div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
