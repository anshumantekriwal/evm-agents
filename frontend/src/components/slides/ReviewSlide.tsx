import React from "react";

interface FormState {
  agentImage: File | null;
  agentName: string;
  agentDescription: string;
  selectedChains: string[];
  agentBehavior: string;
}

interface UIState {
  isCreating: boolean;
  aiRating: number | null;
  aiJustification: string;
}

interface Chain {
  name: string;
  logo: string;
}

interface ReviewSlideProps {
  formState: FormState;
  uiState: UIState;
  updateForm: (field: any, value: any) => void;
  updateUI: (field: any, value: any) => void;
  validateInviteCode: (
    code: string
  ) => Promise<{ valid: boolean; error?: string }>;
  handleFileUpload: (file: File) => void;
  handleAIRating: () => void;
  handleCreateKeypair: () => void;
  onNext: () => void;
  onBack: () => void;
  chains: Chain[];
}

const ReviewSlide = ({
  formState,
  uiState,
  handleCreateKeypair,
  onBack,
  chains,
}: ReviewSlideProps) => {
  return (
    <div style={{ width: "100%" }}>
      <div className="review-card">
        <div className="review-header">
          {formState.agentImage ? (
            <img
              src={URL.createObjectURL(formState.agentImage)}
              alt="Agent profile"
              className="agent-avatar"
            />
          ) : (
            <div className="agent-avatar-placeholder" />
          )}
          <h3 style={{ margin: 0, letterSpacing: "-0.02em" }}>
            {formState.agentName}
          </h3>
        </div>

        <div className="review-section">
          <div className="review-label">Description:</div>
          <div className="review-value">
            {formState.agentDescription || "No description provided"}
          </div>
        </div>

        <div className="review-section">
          <div className="review-label">Strategy:</div>
          <div className="review-value">EVM Trading Agent</div>
        </div>

        <div className="review-section">
          <div className="review-label">Chains:</div>
          <div className="selected-chains">
            {formState.selectedChains?.length > 0 ? (
              formState.selectedChains.map(
                (chainName: string, index: number) => {
                  const chain = chains.find((c: Chain) => c.name === chainName);
                  return (
                    <div key={index} className="selected-chain">
                      <img
                        src={chain?.logo}
                        alt={chainName}
                        className="selected-chain-logo"
                      />
                      <span className="selected-chain-name">{chainName}</span>
                    </div>
                  );
                }
              )
            ) : (
              <div className="review-value">No chains selected</div>
            )}
          </div>
        </div>

        <div className="review-section">
          <div className="review-label">Behavior:</div>
          <div className="review-value">
            {formState.agentBehavior || "No behavior specified"}
          </div>
        </div>

        {uiState.aiRating && (
          <div className="review-section">
            <div className="review-label">AI Rating:</div>
            <div className="ai-rating">
              <span className="ai-rating-value">{uiState.aiRating} / 10</span>
              {uiState.aiJustification && (
                <div className="ai-justification">
                  {uiState.aiJustification}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        className="next-button"
        onClick={handleCreateKeypair}
        disabled={uiState.isCreating}
        style={{
          backgroundColor: uiState.isCreating ? "#666" : "white",
          cursor: uiState.isCreating ? "not-allowed" : "pointer",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        {uiState.isCreating ? (
          <>
            Creating your agent...
            <div className="loading-animation" />
          </>
        ) : (
          "Deploy Agent"
        )}
      </button>

      <button
        onClick={onBack}
        className="next-button"
        style={{
          backgroundColor: "#333333",
          color: "white",
          border: "1px solid #333333",
        }}
      >
        Change Info
      </button>
    </div>
  );
};

export default ReviewSlide;
