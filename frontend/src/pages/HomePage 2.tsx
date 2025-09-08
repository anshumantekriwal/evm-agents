import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import { AuthButton } from "../components/AuthButton";

export const HomePage = () => {
  const { isAuthenticated } = useAuth0();

  // If user is authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <img
          src="/login.png"
          alt="XADE Agent Launcher"
          className="login-image"
        />
        <h1>Xade No-Code Agent Launcher</h1>
        <p>Please sign in to access your dashboard</p>
        <AuthButton />
      </div>
    </div>
  );
};
