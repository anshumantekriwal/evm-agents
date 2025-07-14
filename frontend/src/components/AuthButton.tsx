import { useAuth0 } from "@auth0/auth0-react";
import "./AuthButton.css";

export const AuthButton = () => {
  const { isAuthenticated, loginWithRedirect, logout, user, isLoading } =
    useAuth0();

  if (isLoading) {
    return <div className="auth-loading">Loading...</div>;
  }

  if (isAuthenticated) {
    return (
      <div className="auth-user">
        <span className="auth-welcome">
          Welcome, {user?.name || user?.email}!
        </span>
        <button
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin } })
          }
          className="auth-btn logout"
        >
          Log Out
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => loginWithRedirect()} className="auth-btn login">
      Log In
    </button>
  );
};
