import React from "react";

const BehaviorSlide = ({
  formState,
  uiState,
  updateForm,
  handleAIRating,
  onNext,
  chains,
}) => {
  const sampleStrategies = [
    {
      title: "DCA Strategy",
      description:
        "Execute dollar-cost averaging on blue-chip tokens like WETH and WMATIC every 24 hours. Invest $50 per transaction with 2% slippage tolerance. Monitor for major market crashes and pause during 30%+ drops.",
    },
    {
      title: "Momentum Trading",
      description:
        "Monitor trending tokens on Polygon with 24h volume >$1M. Buy when RSI <30 and price breaks above 20-period MA. Set stop-loss at 5% and take profit at 15%. Maximum 3 positions simultaneously.",
    },
    {
      title: "Arbitrage Bot",
      description:
        "Find price differences between DEXs (Uniswap, SushiSwap, QuickSwap) for the same token pairs. Execute trades when spread >2% after gas costs. Focus on USDC/USDT, WETH/WMATIC pairs with high liquidity.",
    },
    {
      title: "Yield Farming",
      description:
        "Automatically compound rewards from AAVE, Compound, and other DeFi protocols on Polygon. Reinvest rewards daily when gas costs <1% of rewards. Monitor APY changes and migrate to higher-yield opportunities.",
    },
    {
      title: "Grid Trading",
      description:
        "Set up grid orders for WMATIC/USDC pair between $0.80-$1.20 range. Place 10 buy and 10 sell orders with 2% spacing. Rebalance grid when price moves outside range. Target 0.5% profit per trade.",
    },
  ];

  const toggleChain = (chainName) => {
    const currentChains = formState.selectedChains || [];
    const newChains = currentChains.includes(chainName)
      ? currentChains.filter((c) => c !== chainName)
      : [...currentChains, chainName];
    updateForm("selectedChains", newChains);
  };

  const handleStrategyClick = (strategy) => {
    updateForm("agentBehavior", strategy.description);
  };

  return (
    <div style={{ width: "100%" }}>
      <p style={{ marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>
        Describe your agent's behavior and capabilities
      </p>

      <div style={{ marginBottom: "1.5rem" }}>
        <p
          style={{
            marginBottom: "1rem",
            fontSize: "0.9rem",
            color: "#666",
            letterSpacing: "-0.02em",
          }}
        >
          Sample Strategies (click to use):
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          {sampleStrategies.map((strategy, index) => (
            <button
              key={index}
              onClick={() => handleStrategyClick(strategy)}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#333333",
                color: "white",
                border: "1px solid #555555",
                borderRadius: "20px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontFamily: "TikTok Sans, sans-serif",
                letterSpacing: "-0.02em",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#555555";
                e.target.style.borderColor = "#777777";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "#333333";
                e.target.style.borderColor = "#555555";
              }}
            >
              {strategy.title}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={formState.agentBehavior}
        onChange={(e) => updateForm("agentBehavior", e.target.value)}
        placeholder="Describe what you want your agent to do. Be specific about its trading strategies, risk management, and decision-making process."
        className="form-textarea"
        style={{
          fontSize: "1rem",
          letterSpacing: "-0.02em",
          minHeight: "150px",
          marginBottom: "1.5rem",
        }}
      />

      <p style={{ marginBottom: "1rem", letterSpacing: "-0.02em" }}>
        Select the chains your agent should operate on:
      </p>

      <div className="chain-grid">
        {chains.map((chain) => (
          <div
            key={chain.name}
            className={`chain-item ${
              formState.selectedChains?.includes(chain.name) ? "selected" : ""
            }`}
            onClick={() => toggleChain(chain.name)}
          >
            <img src={chain.logo} alt={chain.name} className="chain-logo" />
            <span className="chain-name">{chain.name}</span>
          </div>
        ))}
      </div>

      <button
        onClick={handleAIRating}
        disabled={
          !formState.agentBehavior.trim() || uiState.isGeneratingQuestions
        }
        className="next-button"
        style={{
          backgroundColor:
            !formState.agentBehavior.trim() || uiState.isGeneratingQuestions
              ? "#666"
              : "white",
          cursor:
            !formState.agentBehavior.trim() || uiState.isGeneratingQuestions
              ? "not-allowed"
              : "pointer",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        {uiState.isGeneratingQuestions ? (
          <>
            Analyzing...
            <div className="loading-animation" />
          </>
        ) : (
          "Review Strategy"
        )}
      </button>

      <button
        onClick={onNext}
        disabled={!uiState.reviewEnabled}
        className="next-button"
        style={{
          backgroundColor: !uiState.reviewEnabled ? "#666" : "#333333",
          color: "white",
          cursor: !uiState.reviewEnabled ? "not-allowed" : "pointer",
          marginBottom: "2rem",
        }}
      >
        Continue
      </button>

      {uiState.aiRating !== null && (
        <div className="ai-rating">
          AI Rating:{" "}
          <span className="ai-rating-value">{uiState.aiRating} / 10</span>
          {uiState.aiJustification && (
            <div className="ai-justification">
              <strong>Justification:</strong> {uiState.aiJustification}
            </div>
          )}
        </div>
      )}

      {uiState.followUpQuestions.length > 0 && (
        <div className="follow-up-questions">
          <h4>Follow-up questions:</h4>
          <ul>
            {uiState.followUpQuestions.map((question, index) => (
              <li key={index}>{question}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BehaviorSlide;
