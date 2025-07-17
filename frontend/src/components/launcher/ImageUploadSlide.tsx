import { useRef } from "react";

interface ImageUploadSlideProps {
  formState: {
    agentImage: File | null;
  };
  handleFileUpload: (file: File) => void;
  onNext: () => void;
}

const ImageUploadSlide = ({
  formState,
  handleFileUpload,
  onNext,
}: ImageUploadSlideProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div>
      <div
        className="image-upload-container"
        onClick={handleImageClick}
        style={{
          border: "2px dashed #333333",
          borderRadius: "8px",
          padding: "2rem",
          textAlign: "center" as const,
          cursor: "pointer",
          backgroundColor: "var(--surface)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          const target = e.target as HTMLElement;
          target.style.borderColor = "#666666";
          target.style.backgroundColor = "#333333";
        }}
        onMouseLeave={(e) => {
          const target = e.target as HTMLElement;
          target.style.borderColor = "#333333";
          target.style.backgroundColor = "var(--surface-light)";
        }}
      >
        {formState.agentImage ? (
          <div>
            <img
              src={URL.createObjectURL(formState.agentImage)}
              alt="Agent preview"
              style={{
                maxWidth: "200px",
                maxHeight: "200px",
                borderRadius: "8px",
              }}
            />
            <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>
              Click to change image
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: "3rem",
                marginBottom: "1rem",
                color: "var(--text-secondary)",
              }}
            >
              📸
            </div>
            <p style={{ color: "var(--text-secondary)" }}>
              Click to upload an image for your agent
            </p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <button
        onClick={onNext}
        className="next-button"
        style={{ marginTop: "2rem" }}
      >
        Continue
      </button>
    </div>
  );
};

export default ImageUploadSlide;
