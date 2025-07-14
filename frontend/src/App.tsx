import "./App.css";
import { AuthButton } from "./components/AuthButton.tsx";
import { Dashboard } from "./components/Dashboard.tsx";
import { useAuth0 } from "@auth0/auth0-react";

function App() {
  const { isAuthenticated } = useAuth0();

  return (
    <div className="app">
      {isAuthenticated ? (
        <>
          <div className="auth-container">
            <AuthButton />
          </div>
          <Dashboard />
        </>
      ) : (
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
      )}
    </div>
  );
}

export default App;
