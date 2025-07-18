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

interface BehaviorSlideProps {
  formState: FormState;
  uiState: {
    isGeneratingQuestions: boolean;
    aiRating: number | null;
    followUpQuestions: string[];
  };
  updateForm: (field: string, value: any) => void;
  updateUI: (field: string, value: any) => void;
  onNext: () => void;
  chains: Chain[];
}

const STRATEGY_PROMPTS = [
  {
    name: "DCA Strategy",
    description: "Buy 0.01 USDC using POL every 20 minutes",
  },
  {
    name: "Momentum Strategy",
    description:
      "Track token price momentum using multiple timeframe analysis. Enter long positions when short-term moving averages cross above longer-term averages with increasing volume. Exit when momentum indicators show reversal.",
  },
  {
    name: "Grid Trading",
    description:
      "Create a grid of buy and sell orders across a price range. Automatically profit from price oscillations by buying at lower grid levels and selling at higher levels. Adjust grid spacing based on historical volatility.",
  },
];

const BehaviorSlide = ({
  formState,
  uiState,
  updateForm,
  updateUI,
  onNext,
}: BehaviorSlideProps) => {
  const [hasReviewed, setHasReviewed] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [isLoadingRating, setIsLoadingRating] = useState(false);

  const handlePromptClick = (strategy: (typeof STRATEGY_PROMPTS)[0]) => {
    updateForm("agentBehavior", strategy.description);
    setSelectedStrategy(strategy.name);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateForm("agentBehavior", e.target.value);
    // If user manually types, clear the selected strategy
    if (selectedStrategy) {
      const currentStrategy = STRATEGY_PROMPTS.find(
        (s) => s.description === e.target.value
      );
      if (!currentStrategy) {
        setSelectedStrategy(null);
      }
    }
  };

  const handleReviewStrategy = async () => {
    setIsLoadingRating(true);

    // Wait for 5 seconds before showing the rating
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Hardcoded 8/10 rating
    updateUI("aiRating", 8);
    updateUI(
      "aiJustification",
      "This strategy has a clear objective and well-defined execution parameters."
    );
    setHasReviewed(true);
    setIsLoadingRating(false);
  };

  const canContinue =
    formState.agentBehavior.trim() &&
    hasReviewed &&
    (uiState.aiRating ?? 0) >= 8;

  return (
    <div className="behavior-slide">
      <div className="prompt-buttons">
        {STRATEGY_PROMPTS.map((strategy, index) => (
          <button
            key={index}
            className={`prompt-button ${
              selectedStrategy === strategy.name ? "selected" : ""
            }`}
            onClick={() => handlePromptClick(strategy)}
          >
            {strategy.name}
          </button>
        ))}
      </div>

      <textarea
        value={formState.agentBehavior}
        onChange={handleTextareaChange}
        placeholder="Describe your agent's behavior..."
        rows={6}
        className="behavior-textarea"
      />

      {isLoadingRating && (
        <div className="ai-rating-loading">
          <div className="launcher-loading-spinner"></div>
          <span>Analyzing strategy...</span>
        </div>
      )}

      {uiState.aiRating && !isLoadingRating && (
        <div className="ai-rating-display">
          <div className="rating-content">
            <span className="rating-label">AI Rating:</span>
            <span className="rating-value">{uiState.aiRating}/10</span>
          </div>
          <div className="rating-feedback">
            <span className="feedback-text">
              Great strategy! Well-defined parameters and clear execution logic.
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleReviewStrategy}
        className="next-button"
        disabled={isLoadingRating}
      >
        {isLoadingRating ? "Analyzing..." : "Review Strategy"}
      </button>

      <button onClick={onNext} disabled={!canContinue} className="next-button">
        Continue
      </button>
    </div>
  );
};

export default BehaviorSlide;
