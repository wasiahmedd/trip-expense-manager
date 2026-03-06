import React from 'react';

const AboutPage = () => {
    return (
        <article className="info-page glass-panel">
            <a className="info-back-btn" href="/">Back to Home</a>
            <h1>About TripCash</h1>
            <p className="info-meta">Last updated: March 6, 2026</p>

            <section className="info-section">
                <h2>Purpose</h2>
                <p>
                    TripCash helps friends, families, and teams split trip expenses quickly. It keeps shared spending in
                    one place so everyone can track who paid, who owes, and how to settle up.
                </p>
            </section>

            <section className="info-section">
                <h2>How it works</h2>
                <p>
                    Users can create or join a trip, add expense entries, split costs among participants, and review
                    balance and settlement suggestions. The app is designed to stay lightweight, fast, and easy to use on
                    mobile and desktop.
                </p>
            </section>

            <section className="info-section">
                <h2>Service support</h2>
                <p>
                    To keep the service accessible, TripCash may display advertising such as Google AdSense. Ads help
                    support hosting and ongoing improvements.
                </p>
            </section>
        </article>
    );
};

export default AboutPage;
