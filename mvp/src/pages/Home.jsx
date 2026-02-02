import React from "react";
import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1 className="hero-title">
            Build AI agents
            <br />
            without code
          </h1>
          <p className="hero-description">
            Visual workflow builder for automating customer support,
            <br />
            generating reports, and processing data with AI.
          </p>
          <div className="hero-actions">
            <Link to="/builder" className="btn-primary btn-large">
              Launch Builder
            </Link>
            <a href="#how-it-works" className="btn-secondary btn-large">
              See How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Features</h2>
          </div>

          <div className="feature-grid">
            <div className="feature">
              <h3 className="feature-title">Visual Builder</h3>
              <p className="feature-text">
                Drag and drop blocks to create workflows. No coding knowledge
                required.
              </p>
            </div>

            <div className="feature">
              <h3 className="feature-title">AI Integration</h3>
              <p className="feature-text">
                Powered by Claude AI for intelligent data processing and
                analysis.
              </p>
            </div>

            <div className="feature">
              <h3 className="feature-title">Ready Templates</h3>
              <p className="feature-text">
                Pre-built workflows for customer support and sales reporting.
              </p>
            </div>

            <div className="feature">
              <h3 className="feature-title">Real-time Results</h3>
              <p className="feature-text">
                See your workflow execute and view AI-generated outputs
                instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
          </div>

          <div className="steps">
            <div className="step">
              <div className="step-number">01</div>
              <h3 className="step-title">Choose a template</h3>
              <p className="step-text">
                Start with customer support or sales report templates, or build
                from scratch.
              </p>
            </div>

            <div className="step">
              <div className="step-number">02</div>
              <h3 className="step-title">Customize workflow</h3>
              <p className="step-text">
                Connect blocks to define how your agent processes data and
                generates outputs.
              </p>
            </div>

            <div className="step">
              <div className="step-number">03</div>
              <h3 className="step-title">Run and deploy</h3>
              <p className="step-text">
                Execute your workflow with real data and see AI-powered results
                in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <h2 className="cta-title">Ready to automate?</h2>
          <p className="cta-text">Build your first AI agent in minutes</p>
          <Link to="/builder" className="btn-primary btn-large">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
