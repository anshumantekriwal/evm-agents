import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthButton } from "./AuthButton";
import "./Navbar.css";

const NAV_LINKS = [
  {
    label: "Trade",
    href: "https://trade.xade.xyz",
  },
  {
    label: "Agent K",
    href: "https://agentk.tech",
  },
];

export const Navbar = () => {
  const { isAuthenticated } = useAuth0();

  return (
    <nav className="navbar">
      <div className="navbar-left font-lemon-milk">
        <Link to="/">xade</Link>
      </div>
      <div className="navbar-right">
        {isAuthenticated && (
          <Link to="/dashboard" className="navbar-link">
            Dashboard
          </Link>
        )}
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="navbar-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.label}
            <span className="navbar-link-arrow">↗</span>
          </a>
        ))}
        {isAuthenticated && <AuthButton />}
      </div>
    </nav>
  );
};
