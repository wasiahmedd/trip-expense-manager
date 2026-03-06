import React, { useEffect, useRef, useState } from 'react';

const ADSENSE_SCRIPT_ID = 'tripcash-adsense-script';
const AD_DISMISS_STORAGE_KEY = 'tripcash_ad_bar_hidden_until';
const DEFAULT_SHOW_DELAY_MS = 35000;
const DEFAULT_DISMISS_HOURS = 12;
const DEFAULT_REQUIRED_INTERACTIONS = 2;

let adSenseScriptPromise = null;

const readHiddenUntil = () => {
    if (typeof window === 'undefined') return 0;
    const rawValue = window.localStorage.getItem(AD_DISMISS_STORAGE_KEY);
    const parsedValue = Number.parseInt(rawValue || '0', 10);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const parsePositiveInt = (rawValue, fallbackValue) => {
    const parsedValue = Number.parseInt(String(rawValue || ''), 10);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
};

const parsePositiveFloat = (rawValue, fallbackValue) => {
    const parsedValue = Number.parseFloat(String(rawValue || ''));
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
};

const loadAdSenseScript = (adClient) => {
    if (typeof window === 'undefined') {
        return Promise.resolve();
    }

    if (window.adsbygoogle) {
        return Promise.resolve();
    }

    if (adSenseScriptPromise) {
        return adSenseScriptPromise;
    }

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

const BottomAdBar = ({ enabled = false, onVisibleChange }) => {
    const [isEligibleToShow, setIsEligibleToShow] = useState(false);
    const [isSuppressed, setIsSuppressed] = useState(() => readHiddenUntil() > Date.now());

    const adSlotRef = useRef(null);
    const adRequestedRef = useRef(false);

    const adProvider = (import.meta.env.VITE_AD_PROVIDER || 'adsense').trim().toLowerCase();
    const adClient = (import.meta.env.VITE_ADSENSE_CLIENT || '').trim();
    const adSlot = (import.meta.env.VITE_ADSENSE_BOTTOM_SLOT || '').trim();
    const showDelayMs = parsePositiveInt(import.meta.env.VITE_AD_SHOW_DELAY_MS, DEFAULT_SHOW_DELAY_MS);
    const dismissHours = parsePositiveFloat(import.meta.env.VITE_AD_DISMISS_HOURS, DEFAULT_DISMISS_HOURS);
    const requiredInteractions = parsePositiveInt(
        import.meta.env.VITE_AD_REQUIRED_INTERACTIONS,
        DEFAULT_REQUIRED_INTERACTIONS
    );

    const canRenderAdBar = enabled && adProvider !== 'none';
    const hasAdSenseConfig = adProvider === 'adsense' && adClient.startsWith('ca-pub-') && adSlot.length > 0;
    const isVisible = canRenderAdBar && !isSuppressed && isEligibleToShow;
    const showPlaceholder = adProvider === 'adsense' && !hasAdSenseConfig;

    useEffect(() => {
        if (typeof onVisibleChange !== 'function') return undefined;
        onVisibleChange(isVisible);
        return () => onVisibleChange(false);
    }, [isVisible, onVisibleChange]);

    useEffect(() => {
        if (!canRenderAdBar || isSuppressed) return undefined;

        let interactionCount = 0;
        let delayElapsed = false;

        const interactionEvents = ['pointerdown', 'touchstart', 'keydown', 'scroll'];

        const stopInteractionTracking = () => {
            interactionEvents.forEach((eventName) => {
                window.removeEventListener(eventName, handleInteraction);
            });
        };

        const revealWhenReady = () => {
            if (delayElapsed && interactionCount >= requiredInteractions) {
                setIsEligibleToShow(true);
                stopInteractionTracking();
            }
        };

        const handleInteraction = () => {
            interactionCount += 1;
            revealWhenReady();
        };

        interactionEvents.forEach((eventName) => {
            window.addEventListener(eventName, handleInteraction, { passive: true });
        });

        const revealTimer = window.setTimeout(() => {
            delayElapsed = true;
            revealWhenReady();
        }, showDelayMs);

        return () => {
            window.clearTimeout(revealTimer);
            stopInteractionTracking();
        };
    }, [canRenderAdBar, isSuppressed, requiredInteractions, showDelayMs]);

    useEffect(() => {
        if (!isVisible || !hasAdSenseConfig || !adSlotRef.current || adRequestedRef.current) {
            return undefined;
        }

        let canceled = false;

        loadAdSenseScript(adClient)
            .then(() => {
                if (canceled || adRequestedRef.current) return;
                try {
                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                    adRequestedRef.current = true;
                } catch {
                    // Ignore ad rendering issues to prevent app-level failures.
                }
            })
            .catch(() => {
                // Ignore script loading failure and keep UI stable.
            });

        return () => {
            canceled = true;
        };
    }, [adClient, hasAdSenseConfig, isVisible]);

    const handleDismiss = () => {
        setIsSuppressed(true);
        setIsEligibleToShow(false);
        if (typeof window !== 'undefined') {
            const dismissUntil = Date.now() + Math.round(dismissHours * 60 * 60 * 1000);
            window.localStorage.setItem(AD_DISMISS_STORAGE_KEY, String(dismissUntil));
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <aside className="ad-bottom-bar" aria-label="Sponsored content">
            <div className="ad-bottom-bar-inner glass-panel">
                <span className="ad-bottom-bar-tag">Sponsored</span>
                <div className="ad-bottom-bar-content">
                    {hasAdSenseConfig ? (
                        <ins
                            ref={adSlotRef}
                            className="adsbygoogle ad-bottom-bar-slot"
                            style={{ display: 'block' }}
                            data-ad-client={adClient}
                            data-ad-slot={adSlot}
                            data-ad-format="horizontal"
                            data-full-width-responsive="false"
                            data-adtest={import.meta.env.DEV ? 'on' : undefined}
                        />
                    ) : (
                        <p className="ad-bottom-bar-placeholder">
                            Connect `VITE_ADSENSE_CLIENT` + `VITE_ADSENSE_BOTTOM_SLOT` to start serving paid ads.
                        </p>
                    )}
                </div>
                <button className="ad-bottom-bar-dismiss" onClick={handleDismiss} aria-label="Hide ad bar">
                    Hide
                </button>
            </div>
            {showPlaceholder && (
                <p className="ad-bottom-bar-hint">
                    Placeholder mode is active so you can verify layout before adding real ad IDs.
                </p>
            )}
        </aside>
    );
};

export default BottomAdBar;
