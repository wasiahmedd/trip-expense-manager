import React from 'react';
import InlineAdUnit from './InlineAdUnit';

const BalanceAdCard = ({ onAdRendered }) => {
    const slot = (
        import.meta.env.VITE_ADSENSE_BALANCE_SUMMARY_SLOT ||
        import.meta.env.VITE_ADSENSE_BOTTOM_SLOT ||
        '7670239166'
    ).trim();

    return (
        <section className="glass-panel inline-ad-card balance-ad-card" aria-label="Sponsored">
            <p className="inline-ad-label">Sponsored</p>
            <InlineAdUnit adSlot={slot} format="auto" responsive onAdRendered={onAdRendered} />
        </section>
    );
};

export default BalanceAdCard;
