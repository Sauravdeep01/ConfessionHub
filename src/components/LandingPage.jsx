import React from 'react';
import './LandingPage.css';

const LandingPage = ({ onGetStarted }) => {
    return (
        <div className="landing-container">
            <nav className="landing-nav">
                <div className="landing-logo">
                    <span className="logo-icon">🕊️</span>
                    <span className="logo-text">ConfessHub</span>
                </div>
            </nav>

            <main className="landing-hero">
                <div className="hero-content">
                    <h1 className="hero-title">
                        Speak Your <span className="highlight">Truth</span>, <br />
                        Shield Your <span className="highlight">Name</span>.
                    </h1>
                    <p className="hero-description">
                        The digital sanctuary for your secrets, rants, and confessions.
                        Connect with others anonymously and share what's truly on your mind.
                    </p>
                    <div className="hero-actions">
                        <button className="cta-button" onClick={onGetStarted}>
                            Get Started
                            <span className="cta-icon">→</span>
                        </button>
                    </div>
                </div>
            </main>

            <section className="landing-features">
                <div className="feature-card">
                    <div className="feature-icon">🔒</div>
                    <h3>Full Anonymity</h3>
                    <p>Your identity is protected by advanced encryption. Post without fear.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">✨</div>
                    <h3>Pure Interaction</h3>
                    <p>React and comment on confessions with unique anonymous handles.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">🌈</div>
                    <h3>Safe Space</h3>
                    <p>A community-driven platform built on respect and authenticity.</p>
                </div>
            </section>

            <footer className="landing-footer">
                <p>© 2026 ConfessHub. Built for the voiceless.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
