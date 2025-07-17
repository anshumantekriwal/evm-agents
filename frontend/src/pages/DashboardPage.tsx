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

export const DashboardPage = () => {
  const { user } = useAuth0();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [holdingsTab, setHoldingsTab] = useState<"tokens" | "agents">("tokens");

  // Portfolio stats (mock data - replace with real data later)
  const portfolioStats = [
    {
      label: "Total Value Locked",
      value: "$12,450.00",
      change: "+12.5%",
      isPositive: true,
    },
    {
      label: "Active Agents",
      value: "5",
      change: "+2",
      isPositive: true,
    },
    {
      label: "Total Profit/Loss",
      value: "$1,890.00",
      change: "+8.3%",
      isPositive: true,
    },
  ];

  // Mock portfolio performance data (last 30 days)
  const portfolioPerformanceData = [
    { date: "2024-01-01", value: 10000 },
    { date: "2024-01-03", value: 10200 },
    { date: "2024-01-05", value: 9800 },
    { date: "2024-01-07", value: 10500 },
    { date: "2024-01-09", value: 10800 },
    { date: "2024-01-11", value: 11200 },
    { date: "2024-01-13", value: 10900 },
    { date: "2024-01-15", value: 11500 },
    { date: "2024-01-17", value: 11800 },
    { date: "2024-01-19", value: 12100 },
    { date: "2024-01-21", value: 12450 },
  ];

  // Mock holdings data
  const holdingsData = [
    {
      symbol: "ETH",
      name: "Ethereum",
      amount: 2.5,
      value: 8500,
      change24h: "+5.2%",
      isPositive: true,
      logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
    },
    {
      symbol: "MATIC",
      name: "Polygon",
      amount: 15000,
      value: 3200,
      change24h: "-2.1%",
      isPositive: false,
      logo: "https://coin-images.coingecko.com/coins/images/32440/large/polygon.png",
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      amount: 750,
      value: 750,
      change24h: "0.0%",
      isPositive: true,
      logo: "https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png",
    },
  ];

  // Mock agent portfolio data (sums to 12450)
  const agentPortfolios = [
    {
      id: 1,
      name: "Arbitrage Bot Alpha",
      portfolioValue: 4850,
      change24h: "+12.3%",
      isPositive: true,
      status: "Active",
      trades: 47,
    },
    {
      id: 2,
      name: "Trend Follower Beta",
      portfolioValue: 3200,
      change24h: "+8.7%",
      isPositive: true,
      status: "Active",
      trades: 23,
    },
    {
      id: 3,
      name: "Mean Reversion Gamma",
      portfolioValue: 2400,
      change24h: "-3.2%",
      isPositive: false,
      status: "Active",
      trades: 15,
    },
    {
      id: 4,
      name: "Momentum Trader Delta",
      portfolioValue: 1200,
      change24h: "+15.1%",
      isPositive: true,
      status: "Pending",
      trades: 8,
    },
    {
      id: 5,
      name: "Grid Trading Epsilon",
      portfolioValue: 800,
      change24h: "+2.4%",
      isPositive: true,
      status: "Active",
      trades: 34,
    },
  ];

  useEffect(() => {
    if (user?.email) {
      fetchUserAgents();
    }
  }, [user?.email]);

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
              {portfolioStats.map((stat, index) => (
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
              <h2 className="portfolio-title">Portfolio Performance</h2>
              <div className="portfolio-value">$12,450</div>
            </div>
          </div>

          <div className="chart-container">
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
                      <stop offset="0%" stopColor="#1B8E2D" stopOpacity={0.4} />
                      <stop
                        offset="50%"
                        stopColor="#1B8E2D"
                        stopOpacity={0.2}
                      />
                      <stop offset="100%" stopColor="#1B8E2D" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <XAxis
                    dataKey="date"
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
                      new Date(label).toLocaleDateString("en-US", {
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
                ? `$${holdingsData
                    .reduce((sum, holding) => sum + holding.value, 0)
                    .toLocaleString()}`
                : `$${agentPortfolios
                    .reduce((sum, agent) => sum + agent.portfolioValue, 0)
                    .toLocaleString()}`}
            </span>
          </div>

          <div className="holdings-list">
            {holdingsTab === "tokens"
              ? // Tokens Tab Content
                holdingsData.map((holding, index) => (
                  <div key={index} className="holding-item">
                    <div className="holding-info">
                      <img
                        src={holding.logo}
                        alt={holding.name}
                        className="holding-logo"
                      />
                      <div className="holding-details">
                        <h4>{holding.name}</h4>
                        <span>{holding.symbol}</span>
                      </div>
                    </div>
                    <div className="holding-value">
                      <div className="holding-amount">
                        {holding.amount.toLocaleString()} {holding.symbol}
                      </div>
                      <div
                        className={`holding-change ${
                          holding.isPositive ? "positive" : "negative"
                        }`}
                      >
                        ${holding.value.toLocaleString()} ({holding.change24h})
                      </div>
                    </div>
                  </div>
                ))
              : // Agents Tab Content
                agentPortfolios.map((agent) => (
                  <div key={agent.id} className="holding-item">
                    <div className="holding-info">
                      <div className="agent-avatar-small">
                        {agent.name.charAt(0)}
                      </div>
                      <div className="holding-details">
                        <h4>{agent.name}</h4>
                        <span>{agent.trades} trades</span>
                      </div>
                    </div>
                    <div className="holding-value">
                      <div className="holding-amount">
                        ${agent.portfolioValue.toLocaleString()}
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
                ))}
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
