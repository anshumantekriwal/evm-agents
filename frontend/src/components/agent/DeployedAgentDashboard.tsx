import React, { useState, useEffect } from "react";
import { XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import type { BaseAgentDashboardProps } from "./AgentDashboardShared";
import {
  AgentHeader,
  AgentOverview,
  LoadingState,
  ErrorState,
  getAgentRuntimeStatusBadge,
  getLogsConnectionStatusBadge,
  getTransactionTypeBadge,
  formatDate,
  formatTransactionDate,
  shortenHash,
} from "./AgentDashboardShared";
import "../AgentDashboard.css";

interface PortfolioHistoryPoint {
  timestamp: number;
  date: string;
  value: number;
}

const DeployedAgentDashboard: React.FC<BaseAgentDashboardProps> = ({
  agent,
  loading,
  error,
  deploymentStatus,
  agentLogs,
  agentRuntimeStatus,
  logsConnectionStatus,
  showDebugPanel,
  debugInfo,
  balances,
  balancesLoading,
  balancesError,
  transactions,
  transactionsLoading,
  transactionsError,
  refreshBalances,
  refreshTransactions,
  startLogsWebSocket,
  setShowDebugPanel,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<"portfolio" | "configuration">(
    "portfolio"
  );
  const [portfolioPerformanceData, setPortfolioPerformanceData] = useState<
    PortfolioHistoryPoint[]
  >([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Fetch wallet history for portfolio performance
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

  // Fetch portfolio performance data
  const fetchPortfolioPerformance = async () => {
    if (!agent?.agent_wallet) return;

    try {
      setPortfolioLoading(true);
      setPortfolioError(null);

      const history = await fetchWalletHistory(agent.agent_wallet);

      const portfolioHistory = history.map(([timestamp, value]) => ({
        timestamp,
        date: new Date(timestamp).toISOString(),
        value,
      }));

      setPortfolioPerformanceData(portfolioHistory);
    } catch (error) {
      console.error("Error fetching portfolio performance:", error);
      setPortfolioError("Failed to fetch portfolio performance data");
    } finally {
      setPortfolioLoading(false);
    }
  };

  useEffect(() => {
    if (agent?.agent_wallet && activeTab === "portfolio") {
      fetchPortfolioPerformance();
    }
  }, [agent?.agent_wallet, activeTab]);

  if (loading) {
    return <LoadingState />;
  }

  if (error || !agent) {
    return <ErrorState error={error} onBack={onBack} />;
  }

  // Calculate portfolio stats
  const getPortfolioStats = () => {
    const currentValue =
      portfolioPerformanceData.length > 0
        ? portfolioPerformanceData[portfolioPerformanceData.length - 1].value
        : balances?.reduce(
            (sum, bal) => sum + parseFloat(bal.balance) * (bal.priceUSD || 0),
            0
          ) || 0;

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

    const totalTrades = transactions?.length || 0;

    return [
      {
        label: "Portfolio Value",
        value: `$${currentValue.toLocaleString(undefined, {
          maximumFractionDigits: 2,
        })}`,
        change: `${change24h >= 0 ? "+" : ""}${change24h.toFixed(2)}%`,
        isPositive: change24h >= 0,
      },
      {
        label: "Total Trades",
        value: totalTrades.toString(),
        change: agentRuntimeStatus?.isRunning ? "Active" : "Inactive",
        isPositive: agentRuntimeStatus?.isRunning || false,
      },
      {
        label: "POL Balance",
        value: `${agentRuntimeStatus?.polBalance?.toFixed(4) || "0.0000"} POL`,
        change: agentRuntimeStatus?.phase || "Unknown",
        isPositive: (agentRuntimeStatus?.polBalance || 0) > 0,
      },
    ];
  };

  return (
    <div className="agent-dashboard">
      <AgentHeader
        agent={agent}
        deploymentStatus={deploymentStatus}
        onBack={onBack}
      />

      <div className="deployed-agent-dashboard-content">
        {/* Hero Section */}
        <section className="deployed-hero-section glass-card">
          <div className="deployed-hero-content">
            <h1 className="deployed-hero-title">
              {agent.name || "Agent Dashboard"}
            </h1>
            <p className="deployed-hero-subtitle">
              Monitor your agent's performance, trades, and configuration
            </p>

            {/* Integrated Stats */}
            <div className="deployed-hero-stats">
              {getPortfolioStats().map((stat, index) => (
                <div key={index} className="deployed-hero-stat-item">
                  <div className="deployed-hero-stat-label">{stat.label}</div>
                  <div className="deployed-hero-stat-value">{stat.value}</div>
                  <div
                    className={`deployed-hero-stat-change ${
                      stat.isPositive ? "positive" : "negative"
                    }`}
                  >
                    {stat.change}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <section className="deployed-tabs-section glass-card">
          <div className="deployed-tabs-header">
            <div className="deployed-tabs-nav">
              <button
                className={`deployed-tab ${
                  activeTab === "portfolio" ? "active" : ""
                }`}
                onClick={() => setActiveTab("portfolio")}
              >
                Portfolio
              </button>
              <button
                className={`deployed-tab ${
                  activeTab === "configuration" ? "active" : ""
                }`}
                onClick={() => setActiveTab("configuration")}
              >
                Configuration
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="deployed-tab-content">
            {activeTab === "portfolio" ? (
              <>
                {/* Portfolio Performance Chart */}
                <section className="deployed-portfolio-section glass-card">
                  <div className="deployed-portfolio-header">
                    <div className="deployed-portfolio-title-section">
                      <h2 className="deployed-portfolio-title">
                        PORTFOLIO PERFORMANCE
                      </h2>
                      <div className="deployed-portfolio-value">
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

                  <div className="deployed-chart-container">
                    {portfolioLoading ? (
                      <div className="loading-state">
                        Loading portfolio data...
                      </div>
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
                      <div className="empty-state">
                        No portfolio data available
                      </div>
                    ) : (
                      <div className="deployed-chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={portfolioPerformanceData}>
                            <defs>
                              <linearGradient
                                id="deployedPortfolioGradient"
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
                              formatter={(value: any) => [
                                `$${value.toLocaleString()}`,
                              ]}
                              labelFormatter={(label) =>
                                new Date(Number(label)).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )
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
                              fill="url(#deployedPortfolioGradient)"
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

                {/* Token Holdings */}
                <section className="deployed-holdings-section glass-card">
                  <div className="deployed-holdings-header">
                    <h2 className="deployed-holdings-title">Token Holdings</h2>
                    <button
                      className="deployed-refresh-btn"
                      onClick={refreshBalances}
                      disabled={balancesLoading}
                    >
                      {balancesLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  <div className="deployed-holdings-list">
                    {balancesLoading ? (
                      <div className="loading-state">Loading balances...</div>
                    ) : balancesError ? (
                      <div className="error-state">{balancesError}</div>
                    ) : balances && balances.length > 0 ? (
                      balances.map((balance, index) => (
                        <div key={index} className="deployed-holding-item">
                          <div className="deployed-holding-info">
                            <img
                              src={
                                balance.logoURI ||
                                "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png"
                              }
                              alt={balance.name}
                              className="deployed-holding-logo"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png";
                              }}
                            />
                            <div className="deployed-holding-details">
                              <h4>{balance.name}</h4>
                              <span>{balance.symbol}</span>
                            </div>
                          </div>
                          <div className="deployed-holding-value">
                            <div className="deployed-holding-amount">
                              {parseFloat(balance.balance).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 6,
                                }
                              )}{" "}
                              {balance.symbol}
                            </div>
                            <div className="deployed-holding-usd">
                              $
                              {(
                                parseFloat(balance.balance) *
                                (balance.priceUSD || 0)
                              ).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No token holdings found</div>
                    )}
                  </div>
                </section>

                {/* Transaction History */}
                <section className="deployed-transactions-section glass-card">
                  <div className="deployed-transactions-header">
                    <h2 className="deployed-transactions-title">
                      Transaction History
                    </h2>
                    <button
                      className="deployed-refresh-btn"
                      onClick={refreshTransactions}
                      disabled={transactionsLoading}
                    >
                      {transactionsLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  <div className="deployed-transactions-list">
                    {transactionsLoading ? (
                      <div className="loading-state">
                        Loading transactions...
                      </div>
                    ) : transactionsError ? (
                      <div className="error-state">{transactionsError}</div>
                    ) : transactions && transactions.length > 0 ? (
                      transactions.map((tx, index) => (
                        <div key={index} className="deployed-transaction-item">
                          <div className="deployed-transaction-info">
                            <div className="deployed-transaction-type">
                              {getTransactionTypeBadge(tx.type)}
                            </div>
                            <div className="deployed-transaction-details">
                              <div className="deployed-transaction-token">
                                {tx.asset?.logo && (
                                  <img
                                    src={tx.asset.logo}
                                    alt={tx.asset.symbol}
                                    className="deployed-transaction-logo"
                                  />
                                )}
                                <span>{tx.asset?.symbol || "Unknown"}</span>
                              </div>
                              <div className="deployed-transaction-date">
                                {formatTransactionDate(tx.timestamp)}
                              </div>
                            </div>
                          </div>
                          <div className="deployed-transaction-value">
                            <div className="deployed-transaction-amount">
                              {parseFloat(tx.amount.toString()).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 6,
                                }
                              )}
                            </div>
                            {tx.amount_usd > 0 && (
                              <div className="deployed-transaction-usd">
                                $
                                {tx.amount_usd.toLocaleString(undefined, {
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                            )}
                            <a
                              href={`https://polygonscan.com/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="deployed-transaction-hash"
                            >
                              {shortenHash(tx.hash)}
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No transactions found</div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Configuration Tab */}
                <section className="deployed-config-section glass-card">
                  <div className="deployed-config-header">
                    <h2 className="deployed-config-title">
                      Agent Configuration
                    </h2>
                    <div className="deployed-config-actions">
                      <button className="deployed-action-btn secondary">
                        Edit Configuration
                      </button>
                      <button
                        className="deployed-action-btn secondary"
                        onClick={startLogsWebSocket}
                      >
                        Reconnect Logs
                      </button>
                      <button
                        className="deployed-action-btn secondary"
                        onClick={() => setShowDebugPanel(!showDebugPanel)}
                      >
                        {showDebugPanel ? "Hide Debug" : "Show Debug"}
                      </button>
                      <button className="deployed-action-btn danger">
                        Delete Agent
                      </button>
                    </div>
                  </div>

                  {/* Agent Overview */}
                  <div className="deployed-agent-overview">
                    <AgentOverview agent={agent} />
                  </div>

                  {/* Runtime Status */}
                  <div className="deployed-runtime-status">
                    <h3>Agent Runtime Status</h3>
                    <div className="deployed-runtime-status-card">
                      <div className="deployed-status-header">
                        {getAgentRuntimeStatusBadge(agentRuntimeStatus)}
                        {agentRuntimeStatus?.isRunning && (
                          <span className="deployed-running-indicator">
                            🟢 Running
                          </span>
                        )}
                      </div>

                      {agentRuntimeStatus ? (
                        <div className="deployed-runtime-details">
                          <div className="deployed-runtime-info">
                            <div className="deployed-runtime-item">
                              <span className="deployed-runtime-label">
                                Current Phase:
                              </span>
                              <span className="deployed-runtime-value">
                                {agentRuntimeStatus.phase}
                              </span>
                            </div>
                            <div className="deployed-runtime-item">
                              <span className="deployed-runtime-label">
                                Last Message:
                              </span>
                              <span className="deployed-runtime-value">
                                {agentRuntimeStatus.lastMessage}
                              </span>
                            </div>
                            <div className="deployed-runtime-item">
                              <span className="deployed-runtime-label">
                                Next Step:
                              </span>
                              <span className="deployed-runtime-value">
                                {agentRuntimeStatus.nextStep}
                              </span>
                            </div>
                            <div className="deployed-runtime-item">
                              <span className="deployed-runtime-label">
                                POL Balance:
                              </span>
                              <span className="deployed-runtime-value">
                                {agentRuntimeStatus.polBalance.toFixed(6)} POL
                              </span>
                            </div>
                            <div className="deployed-runtime-item">
                              <span className="deployed-runtime-label">
                                Last Update:
                              </span>
                              <span className="deployed-runtime-value">
                                {formatDate(agentRuntimeStatus.updatedAt)}
                              </span>
                            </div>
                            {agentRuntimeStatus.trades &&
                              agentRuntimeStatus.trades.length > 0 && (
                                <div className="deployed-runtime-item">
                                  <span className="deployed-runtime-label">
                                    Total Trades:
                                  </span>
                                  <span className="deployed-runtime-value">
                                    {agentRuntimeStatus.trades.length}
                                  </span>
                                </div>
                              )}
                          </div>

                          {agentRuntimeStatus.error && (
                            <div className="deployed-runtime-error">
                              <span className="deployed-error-label">
                                Error:
                              </span>
                              <span className="deployed-error-message">
                                {agentRuntimeStatus.error}
                              </span>
                            </div>
                          )}

                          {agentRuntimeStatus.trades &&
                            agentRuntimeStatus.trades.length > 0 && (
                              <div className="deployed-recent-trades">
                                <h4>Recent Trades</h4>
                                {agentRuntimeStatus.trades
                                  .slice(-5)
                                  .map((trade, index) => (
                                    <div
                                      key={index}
                                      className="deployed-trade-item"
                                    >
                                      <span className="deployed-trade-timestamp">
                                        {formatDate(trade.timestamp)}
                                      </span>
                                      <span className="deployed-trade-type">
                                        {trade.type}
                                      </span>
                                      <span className="deployed-trade-details">
                                        {trade.details}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="deployed-no-runtime-status">
                          <p>Waiting for agent runtime status...</p>
                          <p>
                            The agent may be initializing or connecting to the
                            network.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Debug Panel */}
                  {showDebugPanel && (
                    <div className="deployed-debug-panel">
                      <h3>Debug Information</h3>
                      <div className="deployed-debug-info">
                        <div className="deployed-debug-status">
                          <span>Deployment Status: {deploymentStatus}</span>
                          <span>Logs Connection: {logsConnectionStatus}</span>
                          <span>Channel: Connected</span>
                        </div>
                        <div className="deployed-debug-logs">
                          <h4>Debug Logs:</h4>
                          <div className="deployed-debug-log-container">
                            {debugInfo.map((log, index) => (
                              <div
                                key={index}
                                className="deployed-debug-log-entry"
                              >
                                {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Agent Logs */}
                  <div className="deployed-agent-activity">
                    <div className="deployed-logs-header">
                      <h3>Agent Logs</h3>
                      {getLogsConnectionStatusBadge(logsConnectionStatus)}
                    </div>
                    <div className="deployed-logs-container">
                      {agentLogs.length > 0 ? (
                        agentLogs.map((log, index) => (
                          <div key={index} className="deployed-log-entry">
                            {log}
                          </div>
                        ))
                      ) : (
                        <div className="deployed-no-logs">
                          {logsConnectionStatus === "connected"
                            ? "Waiting for logs..."
                            : "No logs available - check connection status"}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DeployedAgentDashboard;
