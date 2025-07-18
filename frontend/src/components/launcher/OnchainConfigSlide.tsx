interface Chain {
  name: string;
  logo: string;
  comingSoon?: boolean;
}

interface FormState {
  ownerAddress: string;
  slippageTolerance: string;
  gasLimit: string;
  selectedChains: string[];
}

interface OnchainConfigSlideProps {
  formState: FormState;
  updateForm: (field: string, value: any) => void;
  onNext: () => void;
  chains: Chain[];
}

const OnchainConfigSlide = ({
  formState,
  updateForm,
  onNext,
  chains,
}: OnchainConfigSlideProps) => {
  const toggleChain = (chainName: string, isComingSoon: boolean = false) => {
    if (isComingSoon) return; // Don't allow selection of coming soon chains

    const currentChains = formState.selectedChains || [];
    const updatedChains = currentChains.includes(chainName)
      ? currentChains.filter((c: string) => c !== chainName)
      : [...currentChains, chainName];
    updateForm("selectedChains", updatedChains);
  };

  const canContinue =
    formState.ownerAddress &&
    formState.slippageTolerance &&
    formState.gasLimit &&
    formState.selectedChains?.length > 0;

  return (
    <div className="onchain-config-slide">
      <div className="config-section">
        <label className="config-label">Owner Address</label>
        <input
          type="text"
          placeholder="0x..."
          value={formState.ownerAddress}
          onChange={(e) => updateForm("ownerAddress", e.target.value)}
          className="form-input"
        />
      </div>

      <div className="config-row">
        <div className="config-section">
          <label className="config-label">Slippage Tolerance (%)</label>
          <input
            type="number"
            step="0.1"
            placeholder="1.0"
            value={formState.slippageTolerance}
            onChange={(e) => updateForm("slippageTolerance", e.target.value)}
            className="form-input"
          />
        </div>

        <div className="config-section">
          <label className="config-label">Gas Limit</label>
          <input
            type="number"
            placeholder="300000"
            value={formState.gasLimit}
            onChange={(e) => updateForm("gasLimit", e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      <div className="config-section">
        <label className="config-label">Supported Chains</label>
        <div className="chain-grid">
          {chains.map((chain, index) => (
            <div
              key={index}
              className={`chain-item ${
                formState.selectedChains?.includes(chain.name) ? "selected" : ""
              } ${chain.comingSoon ? "coming-soon" : ""}`}
              onClick={() => toggleChain(chain.name, chain.comingSoon)}
            >
              <img src={chain.logo} alt={chain.name} className="chain-logo" />
              <span className="chain-name">{chain.name}</span>
              {chain.comingSoon && (
                <span className="coming-soon-badge">Coming Soon</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button onClick={onNext} disabled={!canContinue} className="next-button">
        Continue
      </button>
    </div>
  );
};

export default OnchainConfigSlide;
