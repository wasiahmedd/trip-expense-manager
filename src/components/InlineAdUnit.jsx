import React, { useEffect, useRef } from 'react';

const ADSENSE_SCRIPT_ID = 'tripcash-adsense-script';
let adSenseScriptPromise = null;

const loadAdSenseScript = (adClient) => {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.adsbygoogle) return Promise.resolve();
    if (adSenseScriptPromise) return adSenseScriptPromise;

    adSenseScriptPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById(ADSENSE_SCRIPT_ID);
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Failed to load AdSense script.')), {
                once: true
            });
            return;
        }

        const script = document.createElement('script');
        script.id = ADSENSE_SCRIPT_ID;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adClient)}`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load AdSense script.'));
        document.head.appendChild(script);
    });

    return adSenseScriptPromise;
};

const InlineAdUnit = ({ adSlot, format = 'auto', responsive = true, onAdRendered }) => {
    const adSlotRef = useRef(null);
    const adRequestedRef = useRef(false);
    const onAdRenderedRef = useRef(onAdRendered);

    const adClient = (import.meta.env.VITE_ADSENSE_CLIENT || 'ca-pub-5165375513805507').trim();
    const normalizedSlot = String(adSlot || '').trim();
    const hasAdConfig = adClient.startsWith('ca-pub-') && normalizedSlot.length > 0;

    useEffect(() => {
        onAdRenderedRef.current = onAdRendered;
    }, [onAdRendered]);

    useEffect(() => {
        if (!hasAdConfig || !adSlotRef.current || adRequestedRef.current) return undefined;

        let canceled = false;

        loadAdSenseScript(adClient)
            .then(() => {
                if (canceled || adRequestedRef.current) return;
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                    adRequestedRef.current = true;
                    if (typeof onAdRenderedRef.current === 'function') {
                        onAdRenderedRef.current();
                    }
                } catch {
                    // Ignore ad rendering issues to keep app stable.
                }
            })
            .catch(() => {
                // Ignore script loading failure.
            });

        return () => {
            canceled = true;
        };
    }, [adClient, hasAdConfig, normalizedSlot]);

    if (!hasAdConfig) return null;

    return (
        <ins
            ref={adSlotRef}
            className="adsbygoogle inline-ad-unit"
            style={{ display: 'block' }}
            data-ad-client={adClient}
            data-ad-slot={normalizedSlot}
            data-ad-format={format}
            data-full-width-responsive={responsive ? 'true' : 'false'}
            data-adtest={import.meta.env.DEV ? 'on' : undefined}
        />
    );
};

export default InlineAdUnit;
