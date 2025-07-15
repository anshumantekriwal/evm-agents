import { useAuth0 } from "@auth0/auth0-react";
import "./AuthButton.css";

export const AuthButton = () => {
  const { isAuthenticated, loginWithRedirect, logout, isLoading } = useAuth0();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <button
        onClick={() =>
          logout({ logoutParams: { returnTo: window.location.origin } })
        }
        className="navbar-logout-btn"
      >
        Log Out
      </button>
    );
  } else {
    return (
      <button onClick={() => loginWithRedirect()} className="login-btn">
        Log In
      </button>
    );
  }
};
