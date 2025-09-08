import { useParams, useNavigate, Navigate } from "react-router-dom";
import AgentDashboard from "../components/AgentDashboard";

export const AgentPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/dashboard");
  };

  // If no ID or invalid ID, redirect to dashboard
  if (!id || isNaN(Number(id))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <AgentDashboard agentId={Number(id)} onBack={handleBack} />;
};
