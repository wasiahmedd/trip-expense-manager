import React from 'react';

const TermsOfService = () => {
    return (
        <article className="info-page glass-panel">
            <a className="info-back-btn" href="/">Back to Home</a>
            <h1>Terms of Service</h1>
            <p className="info-meta">Last updated: March 6, 2026</p>

            <section className="info-section">
                <h2>Acceptable use</h2>
                <p>
                    You agree to use TripCash only for lawful and legitimate expense tracking. You must not misuse the
                    service, attempt unauthorized access, or interfere with app operations.
                </p>
            </section>

            <section className="info-section">
                <h2>Service availability</h2>
                <p>
                    TripCash is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any
                    kind. Features may change, pause, or be removed at any time.
                </p>
            </section>

            <section className="info-section">
                <h2>Expense calculations</h2>
                <p>
                    Settlement and balance calculations are informational tools only. Users are responsible for verifying
                    entries and final amounts before making real-world payments.
                </p>
            </section>

            <section className="info-section">
                <h2>Limitation of liability</h2>
                <p>
                    TripCash and its operators are not liable for losses, payment disputes, or damages resulting from data
                    input errors, interpretation of results, or third-party service interruptions.
                </p>
            </section>

            <section className="info-section">
                <h2>Updates to terms</h2>
                <p>
                    We may update these terms periodically. Continued use of the service after updates indicates acceptance
                    of the revised terms.
                </p>
            </section>
        </article>
    );
};

export default TermsOfService;
