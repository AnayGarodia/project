import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import Home from "./pages/Home";
import Builder from "./pages/Builder.jsx";
import "./App.css";
import Workspace from "./pages/Workspace";

function Navigation() {
  const location = useLocation();
  const isBuilder = location.pathname === "/builder";

  return (
    <nav className="nav">
      <Link to="/" className="logo">
        AgentForge
      </Link>
      {!isBuilder && (
        <div className="nav-actions">
          <a href="#features" className="nav-link">
            Features
          </a>
          <a href="#how-it-works" className="nav-link">
            How It Works
          </a>
          <Link to="/builder" className="btn-primary">
            Launch Builder
          </Link>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/workspace" element={<Workspace />} />
        </Routes>
      </div>
    </Router>
  );
}
