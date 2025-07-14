import { useAuth0 } from "@auth0/auth0-react";
import { useState } from "react";
import "./Dashboard.css";
import TradingAgentLauncher from "./TradingAgentLauncher";

export const Dashboard = () => {
  const { user } = useAuth0();
  const [showLauncher, setShowLauncher] = useState(false);

  const handleDeployAgent = () => {
    setShowLauncher(true);
  };

  if (showLauncher) {
    return <TradingAgentLauncher />;
  }

  return (
    <div className="dashboard">
      <nav className="navbar">
        <div className="navbar-content">
          <h1>EVM Agents</h1>
        </div>
      </nav>

      <div className="dashboard-content">
        <button className="deploy-agent-btn" onClick={handleDeployAgent}>
          Deploy Agent
        </button>
      </div>
    </div>
  );
};
