import React from "react";
import type { BaseAgentDashboardProps } from "./AgentDashboardShared";
import DeployedAgentDashboard from "./DeployedAgentDashboard";
import UndeployedAgentDashboard from "./UndeployedAgentDashboard";
import "../AgentDashboard.css";

const AgentDashboardUI: React.FC<BaseAgentDashboardProps> = (props) => {
  const { agent, deploymentStatus } = props;

  // Determine if agent is deployed
  const isDeployed =
    agent?.agent_deployed === true || deploymentStatus === "deployed";

  // Route to appropriate dashboard component
  if (isDeployed) {
    return <DeployedAgentDashboard {...props} />;
  } else {
    return <UndeployedAgentDashboard {...props} />;
  }
};

export default AgentDashboardUI;
