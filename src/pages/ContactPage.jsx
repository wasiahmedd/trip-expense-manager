import React from 'react';

const ContactPage = () => {
    return (
        <article className="info-page glass-panel">
            <a className="info-back-btn" href="/">Back to Home</a>
            <h1>Contact</h1>
            <p className="info-meta">Last updated: March 6, 2026</p>

            <section className="info-section">
                <h2>Get in touch</h2>
                <p>
                    For support, bug reports, or account questions, email{' '}
                    <a href="mailto:wasiahemadchoudhary@gmail.com">wasiahemadchoudhary@gmail.com</a>
                </p>
            </section>

            <section className="info-section">
                <h2>Feedback</h2>
                <p>
                    Product feedback is welcome. Share what worked well, what felt confusing, and which features would make
                    group expense tracking easier for your trips.
                </p>
            </section>
        </article>
    );
};

export default ContactPage;
