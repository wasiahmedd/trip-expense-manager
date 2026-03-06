import React from 'react';

const PrivacyPolicy = () => {
    return (
        <article className="info-page glass-panel">
            <a className="info-back-btn" href="/">Back to Home</a>
            <h1>Privacy Policy</h1>
            <p className="info-meta">Last updated: March 6, 2026</p>

            <section className="info-section">
                <h2>Information we collect</h2>
                <p>
                    TripCash may collect account data (such as email and display name), trip data you enter (trip names,
                    participant names, and expense entries), and basic technical information required to operate the app.
                </p>
            </section>

            <section className="info-section">
                <h2>Authentication and Firebase</h2>
                <p>
                    TripCash uses Firebase Authentication to sign users in and manage account access. Firebase may process
                    authentication metadata according to Google Firebase policies.
                </p>
            </section>

            <section className="info-section">
                <h2>Advertising and cookies</h2>
                <p>
                    TripCash may use Google AdSense to display ads. Google and its partners may use cookies or similar
                    technologies to serve personalized or non-personalized ads based on browsing context and applicable
                    consent settings.
                </p>
            </section>

            <section className="info-section">
                <h2>Logs and analytics</h2>
                <p>
                    We may keep basic server logs and operational diagnostics (for example, error and performance logs) to
                    maintain reliability and security. If analytics tools are used, they are used for product improvement
                    and service health monitoring.
                </p>
            </section>

            <section className="info-section">
                <h2>Data sharing and sale</h2>
                <p>
                    TripCash does not sell your personal data to third parties. Data may be processed by trusted service
                    providers only as needed to run authentication, hosting, and ad delivery.
                </p>
            </section>

            <section className="info-section">
                <h2>Contact</h2>
                <p>
                    For privacy questions, contact us at <a href="mailto:wasiahemadchoudhary@gmail.com">wasiahemadchoudhary@gmail.com</a>
                </p>
            </section>
        </article>
    );
};

export default PrivacyPolicy;
