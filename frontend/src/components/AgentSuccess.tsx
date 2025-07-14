interface AgentSuccessProps {
  agentData: {
    id: string;
    name: string;
    description: string;
    image?: string;
  };
  onBackToDashboard: () => void;
}

const AgentSuccess = ({ agentData, onBackToDashboard }: AgentSuccessProps) => {
  return (
    <div className="agent-success-container">
      <div className="success-content">
        <div className="success-icon">✅</div>

        <h1>Agent Created Successfully!</h1>

        <div className="agent-info">
          {agentData.image && (
            <img
              src={agentData.image}
              alt={agentData.name}
              className="agent-image"
            />
          )}
          <h2>{agentData.name}</h2>
          <p>{agentData.description}</p>
        </div>

        <div className="success-actions">
          <button
            className="primary-button"
            onClick={onBackToDashboard}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = "#f0f0f0";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = "white";
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentSuccess;
