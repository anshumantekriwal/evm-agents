import { useNavigate } from "react-router-dom";
import TradingAgentLauncher from "../components/TradingAgentLauncher";

export const CreateAgentPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleAgentCreated = (agentId: number) => {
    navigate(`/agent/${agentId}`);
  };

  return (
    <TradingAgentLauncher
      onBack={handleBack}
      onAgentCreated={handleAgentCreated}
    />
  );
};
