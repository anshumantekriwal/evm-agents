interface BasicInfoSlideProps {
  formState: {
    agentName: string;
    agentDescription: string;
  };
  updateForm: (field: string, value: string) => void;
  onNext: () => void;
}

const BasicInfoSlide = ({
  formState,
  updateForm,
  onNext,
}: BasicInfoSlideProps) => {
  const canContinue =
    formState.agentName.trim() && formState.agentDescription.trim();

  return (
    <div>
      <div className="input-group">
        <label htmlFor="agentName">Agent Name</label>
        <input
          id="agentName"
          type="text"
          placeholder="Enter your agent's name"
          value={formState.agentName}
          onChange={(e) => updateForm("agentName", e.target.value)}
          className="form-input"
        />
      </div>

      <div className="input-group">
        <label htmlFor="agentDescription">Agent Description</label>
        <textarea
          id="agentDescription"
          placeholder="Describe what your agent does"
          value={formState.agentDescription}
          onChange={(e) => updateForm("agentDescription", e.target.value)}
          className="form-textarea"
          rows={4}
        />
      </div>

      <button onClick={onNext} disabled={!canContinue} className="next-button">
        Continue
      </button>
    </div>
  );
};

export default BasicInfoSlide;
