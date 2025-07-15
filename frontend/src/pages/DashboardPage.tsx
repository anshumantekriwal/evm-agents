import { useState, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link } from "react-router-dom";
import { supabase, type Agent } from "../lib/supabase";
import "../components/Dashboard.css";

export const DashboardPage = () => {
  const { user } = useAuth0();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (deployed === true) return "#4CAF50"; // green for deployed
    if (deployed === false) return "#FF9800"; // orange for not deployed
    return "#9E9E9E"; // gray for unknown
  };

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Your Agents</h1>
          <Link to="/create-agent" className="create-agent-btn">
            + Create New Agent
          </Link>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchUserAgents} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading your agents...</p>
          </div>
        ) : (
          <div className="agents-grid">
            {agents.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🤖</div>
                <h3>No agents yet</h3>
                <p>Create your first EVM trading agent to get started</p>
                <Link to="/create-agent" className="create-first-agent-btn">
                  Create Your First Agent
                </Link>
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="agent-card">
                  <div className="agent-status">
                    <div
                      className="status-indicator"
                      style={{
                        backgroundColor: getStatusColor(agent.agent_deployed),
                      }}
                    ></div>
                    <span className="status-text">
                      {agent.agent_deployed === true
                        ? "Deployed"
                        : agent.agent_deployed === false
                        ? "Pending"
                        : "Unknown"}
                    </span>
                  </div>

                  <div className="agent-card-content">
                    <h3 className="agent-name">
                      {agent.name || "Unnamed Agent"}
                    </h3>
                    <p className="agent-description">
                      {agent.description ||
                        agent.prompt ||
                        "No description available"}
                    </p>

                    <div className="agent-meta">
                      <div className="meta-item">
                        <span className="meta-label">Owner:</span>
                        <span className="meta-value">
                          {agent.owner_address
                            ? `${agent.owner_address.slice(
                                0,
                                6
                              )}...${agent.owner_address.slice(-4)}`
                            : "Not set"}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Chains:</span>
                        <span className="meta-value">
                          {agent.selected_chains?.length
                            ? agent.selected_chains.join(", ")
                            : "None"}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Created:</span>
                        <span className="meta-value">
                          {formatDate(agent.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="agent-card-actions">
                    <Link
                      to={`/agent/${agent.id}`}
                      className="agent-action-btn primary"
                    >
                      View Details
                    </Link>
                    <button className="agent-action-btn secondary">
                      Configure
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
