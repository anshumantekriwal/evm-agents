import React from "react";
import { useAgentDashboard } from "./agent/useAgentDashboard";
import AgentDashboardUI from "./agent/AgentDashboardUI";

interface AgentDashboardProps {
  agentId: number;
  onBack: () => void;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ agentId, onBack }) => {
  const dashboardData = useAgentDashboard({ agentId });

  return <AgentDashboardUI {...dashboardData} onBack={onBack} />;
};

export default AgentDashboard;
