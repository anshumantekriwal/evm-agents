import React, { useRef } from "react";

const ImageUploadSlide = ({ formState, handleFileUpload, onNext }) => {
  const fileInputRef = useRef(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleFileUpload(file);
    }
  };

  return (
    <>
      <p style={{ marginBottom: "2rem", letterSpacing: "-0.02em" }}>
        Upload a profile picture for {formState.agentName || "your agent"}
      </p>

      <div
        onClick={handleImageClick}
        style={{
          width: "350px",
          height: "350px",
          border: "2px dashed #333333",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          margin: "0 auto 2rem auto",
          backgroundColor: formState.agentImage
            ? "transparent"
            : "var(--surface-light)",
          transition: "all 0.2s",
          overflow: "hidden",
        }}
        onMouseEnter={(e) => {
          if (!formState.agentImage) {
            e.target.style.borderColor = "#666666";
            e.target.style.backgroundColor = "#333333";
          }
        }}
        onMouseLeave={(e) => {
          if (!formState.agentImage) {
            e.target.style.borderColor = "#333333";
            e.target.style.backgroundColor = "var(--surface-light)";
          }
        }}
      >
        {formState.agentImage ? (
          <img
            src={URL.createObjectURL(formState.agentImage)}
            alt="Agent profile"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: "50%",
            }}
          />
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              letterSpacing: "-0.02em",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📷</div>
            <div style={{ fontSize: "0.9rem" }}>Click to upload</div>
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

      <p
        style={{
          fontSize: "0.9rem",
          color: "var(--text-secondary)",
          marginBottom: "2rem",
          textAlign: "center",
          letterSpacing: "-0.02em",
        }}
      >
        Recommended: Square image, at least 400x400px
      </p>

      <button
        className="next-button"
        onClick={onNext}
        style={{
          backgroundColor: "white",
          cursor: "pointer",
        }}
      >
        Continue
      </button>
    </>
  );
};

export default ImageUploadSlide;
