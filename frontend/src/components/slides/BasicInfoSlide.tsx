import React from "react";

const BasicInfoSlide = ({ formState, updateForm, onNext }) => {
  return (
    <>
      <p style={{ marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>
        How should we call your EVM Agent?
      </p>

      <input
        type="text"
        value={formState.agentName}
        onChange={(e) => updateForm("agentName", e.target.value)}
        placeholder="Enter agent name"
        className="form-input"
        style={{
          fontSize: "1rem",
          letterSpacing: "-0.02em",
        }}
      />

      <p style={{ marginBottom: "1rem", letterSpacing: "-0.02em" }}>
        {`What should people know about ${
          formState.agentName || "your agent"
        }?`}
      </p>

      <textarea
        value={formState.agentDescription}
        onChange={(e) => updateForm("agentDescription", e.target.value)}
        placeholder="Add some description about the agent that everyone will see"
        className="form-textarea"
        style={{
          fontSize: "1rem",
          letterSpacing: "-0.02em",
          minHeight: "120px",
        }}
      />

      <button
        className="next-button"
        onClick={onNext}
        disabled={!formState.agentName.trim()}
        style={{
          backgroundColor: !formState.agentName.trim() ? "#666" : "white",
          cursor: !formState.agentName.trim() ? "not-allowed" : "pointer",
        }}
      >
        Continue
      </button>
    </>
  );
};

export default BasicInfoSlide;
