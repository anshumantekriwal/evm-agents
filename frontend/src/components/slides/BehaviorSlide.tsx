import { useState } from "react";

interface Chain {
  name: string;
  logo: string;
}

interface FormState {
  agentBehavior: string;
  selectedChains: string[];
  selectedStrategy: string;
}

interface UIState {
  isGeneratingQuestions: boolean;
  aiRating: number | null;
  followUpQuestions: string[];
}

interface BehaviorSlideProps {
  formState: FormState;
  uiState: UIState;
  updateForm: (field: string, value: any) => void;
  handleAIRating: () => void;
  onNext: () => void;
  chains: Chain[];
}

const BehaviorSlide = ({
  formState,
  uiState,
  updateForm,
  handleAIRating,
  onNext,
  chains,
}: BehaviorSlideProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleChain = (chainName: string) => {
    const currentChains = formState.selectedChains || [];
    const updatedChains = currentChains.includes(chainName)
      ? currentChains.filter((c: string) => c !== chainName)
      : [...currentChains, chainName];
    updateForm("selectedChains", updatedChains);
  };

  const handleStrategyClick = (strategy: string) => {
    updateForm("selectedStrategy", strategy);
  };

  const canContinue = formState.agentBehavior.trim();

  return (
    <div>
      <div className="input-group">
        <label htmlFor="agentBehavior">Describe your agent's behavior</label>
        <textarea
          id="agentBehavior"
          value={formState.agentBehavior}
          onChange={(e) => updateForm("agentBehavior", e.target.value)}
          placeholder="Describe what you want your agent to do..."
          className="form-textarea"
          rows={6}
        />
      </div>

      <div className="strategy-section">
        <h3>Trading Strategy</h3>
        <div className="strategy-options">
          <button
            className={`strategy-button ${
              formState.selectedStrategy === "trading" ? "selected" : ""
            }`}
            onClick={() => handleStrategyClick("trading")}
            onMouseEnter={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = "#555555";
              target.style.borderColor = "#777777";
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLElement;
              target.style.backgroundColor = "#333333";
              target.style.borderColor = "#555555";
            }}
          >
            EVM Trading Agent
          </button>
        </div>
      </div>

      <div className="chains-section">
        <div className="chains-header">
          <h3>Select Chains</h3>
          <button
            onClick={toggleExpansion}
            className="expand-button"
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {isExpanded ? "Show Less" : "Show All"}
          </button>
        </div>
        <div className="chains-grid">
          {chains.map((chain: Chain) => (
            <div
              key={chain.name}
              className={`chain-option ${
                formState.selectedChains?.includes(chain.name) ? "selected" : ""
              }`}
              onClick={() => toggleChain(chain.name)}
            >
              <img
                src={chain.logo}
                alt={chain.name}
                className="chain-logo"
                style={{ width: "24px", height: "24px" }}
              />
              <span>{chain.name}</span>
            </div>
          ))}
        </div>
      </div>

      {formState.agentBehavior.trim() && (
        <div className="ai-rating-section">
          <button
            onClick={handleAIRating}
            disabled={uiState.isGeneratingQuestions}
            className="ai-rating-button"
          >
            {uiState.isGeneratingQuestions
              ? "Analyzing Strategy..."
              : "Get AI Rating"}
          </button>

          {uiState.aiRating && (
            <div className="ai-rating-result">
              <div className="rating-score">
                AI Rating: {uiState.aiRating}/10
              </div>
            </div>
          )}
        </div>
      )}

      {uiState.followUpQuestions.length > 0 && (
        <div className="follow-up-questions">
          <h4>Follow-up Questions:</h4>
          <ul>
            {uiState.followUpQuestions.map(
              (question: string, index: number) => (
                <li key={index}>{question}</li>
              )
            )}
          </ul>
        </div>
      )}

      <button onClick={onNext} disabled={!canContinue} className="next-button">
        Continue to Review
      </button>
    </div>
  );
};

export default BehaviorSlide;
