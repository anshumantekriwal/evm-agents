import React from "react";

const AgentSuccess = ({ agentData, onBackToDashboard }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000000",
        color: "white",
        padding: "2rem",
        fontFamily: "TikTok Sans, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            marginBottom: "1rem",
            letterSpacing: "-0.05em",
          }}
        >
          🎉 Agent Deployed Successfully!
        </h1>

        <p
          style={{
            fontSize: "1.2rem",
            color: "#666666",
            marginBottom: "3rem",
            letterSpacing: "-0.02em",
          }}
        >
          Your EVM trading agent has been created and saved.
        </p>

        <div
          style={{
            backgroundColor: "#111111",
            border: "1px solid #333333",
            borderRadius: "12px",
            padding: "2rem",
            marginBottom: "3rem",
            textAlign: "left",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            {agentData.image && (
              <img
                src={agentData.image}
                alt="Agent"
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            )}
            <div>
              <h2
                style={{
                  fontSize: "2rem",
                  margin: "0 0 0.5rem 0",
                  letterSpacing: "-0.02em",
                }}
              >
                {agentData.name}
              </h2>
              <p
                style={{
                  color: "#666666",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                Agent ID: {agentData.id}
              </p>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.2rem",
                marginBottom: "0.5rem",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Description:
            </h3>
            <p
              style={{
                color: "#cccccc",
                lineHeight: "1.6",
                letterSpacing: "-0.02em",
              }}
            >
              {agentData.description || "No description provided"}
            </p>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.2rem",
                marginBottom: "0.5rem",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Strategy:
            </h3>
            <p
              style={{
                color: "#cccccc",
                lineHeight: "1.6",
                letterSpacing: "-0.02em",
              }}
            >
              {agentData.prompt}
            </p>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1.2rem",
                marginBottom: "0.5rem",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Status:
            </h3>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#333333",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  letterSpacing: "-0.02em",
                }}
              >
                📊 Chain: Polygon
              </span>
              <span
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#333333",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  letterSpacing: "-0.02em",
                }}
              >
                🤖 AI Rating: 8/10
              </span>
              <span
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "#ff6b35",
                  borderRadius: "20px",
                  fontSize: "0.9rem",
                  letterSpacing: "-0.02em",
                }}
              >
                ⏳ Deployment: Pending
              </span>
            </div>
          </div>

          <div>
            <h3
              style={{
                fontSize: "1.2rem",
                marginBottom: "0.5rem",
                color: "#ffffff",
                letterSpacing: "-0.02em",
              }}
            >
              Created:
            </h3>
            <p
              style={{
                color: "#cccccc",
                letterSpacing: "-0.02em",
              }}
            >
              {new Date(agentData.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <button
          onClick={onBackToDashboard}
          style={{
            backgroundColor: "white",
            color: "black",
            border: "none",
            padding: "1rem 2rem",
            borderRadius: "8px",
            fontSize: "1.1rem",
            fontFamily: "TikTok Sans, sans-serif",
            letterSpacing: "-0.02em",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = "#f0f0f0";
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = "white";
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default AgentSuccess;
