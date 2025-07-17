import React from "react";
import { type Agent } from "../../config";
import {
  type DeploymentStatus,
  type AgentRuntimeStatus,
} from "./useAgentDashboard";
import type { BaseAgentDashboardProps } from "./AgentDashboardShared";
import DeployedAgentDashboard from "./DeployedAgentDashboard";
import UndeployedAgentDashboard from "./UndeployedAgentDashboard";
import "../AgentDashboard.css";

interface AgentDashboardUIProps extends BaseAgentDashboardProps {}

const AgentDashboardUI: React.FC<AgentDashboardUIProps> = (props) => {
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
