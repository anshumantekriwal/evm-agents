import { useState } from "react";
import TradingAgentLauncher from "./TradingAgentLauncher";
import "./Dashboard.css";

export const Dashboard = () => {
  const [currentView, setCurrentView] = useState("dashboard");

  const handleCreateAgent = () => {
    setCurrentView("create-agent");
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
  };

  if (currentView === "create-agent") {
    return <TradingAgentLauncher onBack={handleBackToDashboard} />;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>EVM Agent Dashboard</h1>
        <p>Manage your autonomous EVM trading agents</p>
      </div>

      <div className="dashboard-content">
        <div className="agent-grid">
          <div className="create-agent-card" onClick={handleCreateAgent}>
            <div className="create-icon">+</div>
            <h3>Create New Agent</h3>
            <p>Launch a new EVM trading agent</p>
          </div>
        </div>
      </div>
    </div>
  );
};
