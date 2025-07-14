import React, { useState } from "react";

const InviteSlide = ({ formState, updateForm, validateInviteCode, onNext }) => {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!formState.inviteCode.trim()) return;

    setIsValidating(true);
    setError("");

    try {
      const result = await validateInviteCode(formState.inviteCode);
      if (result.valid) {
        onNext();
      } else {
        setError(result.error || "Invalid invite code");
      }
    } catch (err) {
      setError("Failed to validate invite code");
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && formState.inviteCode.trim() && !isValidating) {
      handleSubmit();
    }
  };

  return (
    <>
      <p style={{ marginBottom: "1.5rem", letterSpacing: "-0.02em" }}>
        Please enter your invitation code to continue
      </p>

      <input
        type="text"
        value={formState.inviteCode}
        onChange={(e) => updateForm("inviteCode", e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter invite code (try: XADE2024 or EVM123)"
        className="form-input"
        style={{
          fontSize: "1rem",
          letterSpacing: "-0.02em",
        }}
      />

      {error && (
        <div
          style={{
            color: "#ff0000",
            fontSize: "0.9rem",
            marginBottom: "1rem",
            letterSpacing: "-0.02em",
          }}
        >
          {error}
        </div>
      )}

      <button
        className="next-button"
        onClick={handleSubmit}
        disabled={!formState.inviteCode.trim() || isValidating}
        style={{
          backgroundColor:
            !formState.inviteCode.trim() || isValidating ? "#666" : "white",
          cursor:
            !formState.inviteCode.trim() || isValidating
              ? "not-allowed"
              : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        {isValidating ? (
          <>
            Validating...
            <div className="loading-animation" />
          </>
        ) : (
          "Continue"
        )}
      </button>
    </>
  );
};

export default InviteSlide;
