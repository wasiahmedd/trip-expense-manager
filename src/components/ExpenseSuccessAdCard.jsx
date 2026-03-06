import React from 'react';
import InlineAdUnit from './InlineAdUnit';

const ExpenseSuccessAdCard = ({ onAdRendered }) => {
    const slot = (
        import.meta.env.VITE_ADSENSE_EXPENSE_SUCCESS_SLOT ||
        import.meta.env.VITE_ADSENSE_BOTTOM_SLOT ||
        '7670239166'
    ).trim();

    return (
        <section className="glass-panel inline-ad-card expense-success-ad-card" aria-label="Sponsored">
            <p className="inline-ad-label">Sponsored</p>
            <InlineAdUnit adSlot={slot} format="auto" responsive onAdRendered={onAdRendered} />
        </section>
    );
};

export default ExpenseSuccessAdCard;
