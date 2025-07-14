import { useState } from "react";

interface InviteSlideProps {
  formState: {
    inviteCode: string;
  };
  updateForm: (field: string, value: string) => void;
  validateInviteCode: (
    code: string
  ) => Promise<{ valid: boolean; error?: string }>;
  onNext: () => void;
}

const InviteSlide = ({
  formState,
  updateForm,
  validateInviteCode,
  onNext,
}: InviteSlideProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!formState.inviteCode.trim()) {
      setError("Please enter an invite code");
      return;
    }

    setIsValidating(true);
    setError("");

    const result = await validateInviteCode(formState.inviteCode);

    if (result.valid) {
      onNext();
    } else {
      setError(result.error || "Invalid invite code");
    }

    setIsValidating(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div>
      <div className="input-group">
        <input
          type="text"
          placeholder="Enter your invite code"
          value={formState.inviteCode}
          onChange={(e) => updateForm("inviteCode", e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isValidating}
          className="form-input"
        />
        {error && <div className="error-message">{error}</div>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isValidating || !formState.inviteCode.trim()}
        className="next-button"
      >
        {isValidating ? "Validating..." : "Continue"}
      </button>
    </div>
  );
};

export default InviteSlide;
