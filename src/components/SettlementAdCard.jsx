import React from 'react';
import InlineAdUnit from './InlineAdUnit';

const SettlementAdCard = ({ onAdRendered }) => {
    const slot = (
        import.meta.env.VITE_ADSENSE_SETTLEMENT_SLOT ||
        import.meta.env.VITE_ADSENSE_BOTTOM_SLOT ||
        '7670239166'
    ).trim();

    return (
        <section className="glass-panel inline-ad-card settlement-ad-card" aria-label="Sponsored">
            <p className="inline-ad-label">Sponsored</p>
            <InlineAdUnit adSlot={slot} format="auto" responsive onAdRendered={onAdRendered} />
        </section>
    );
};

export default SettlementAdCard;
