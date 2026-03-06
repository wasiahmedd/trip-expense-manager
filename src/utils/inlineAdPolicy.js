const STORAGE_KEY = 'tripcash_inline_ads_state_v1';

const parsePositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBoolean = (value, fallback) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return fallback;
};

const getPolicySettings = () => ({
    maxAdsPerSession: parsePositiveInt(import.meta.env.VITE_AD_MAX_PER_SESSION, 4),
    cooldownMs: parsePositiveInt(import.meta.env.VITE_AD_COOLDOWN_SECONDS, 90) * 1000,
    noRepeatConsecutive: toBoolean(import.meta.env.VITE_AD_NO_REPEAT_CONSECUTIVE, true)
});

const defaultState = () => ({
    shownCount: 0,
    lastShownAt: 0,
    lastPlacement: ''
});

const readPolicyState = () => {
    if (typeof window === 'undefined' || !window.sessionStorage) return defaultState();
    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultState();
        const parsed = JSON.parse(raw);
        return {
            shownCount: parsePositiveInt(parsed?.shownCount, 0),
            lastShownAt: parsePositiveInt(parsed?.lastShownAt, 0),
            lastPlacement: typeof parsed?.lastPlacement === 'string' ? parsed.lastPlacement : ''
        };
    } catch {
        return defaultState();
    }
};

const writePolicyState = (state) => {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Ignore session storage write errors.
    }
};

export const canShowInlineAd = (placementKey) => {
    if (!placementKey) return false;
    const settings = getPolicySettings();
    const state = readPolicyState();
    const now = Date.now();

    if (state.shownCount >= settings.maxAdsPerSession) return false;
    if (state.lastShownAt > 0 && now - state.lastShownAt < settings.cooldownMs) return false;
    if (settings.noRepeatConsecutive && state.lastPlacement === placementKey) return false;

    return true;
};

export const registerInlineAdShown = (placementKey) => {
    if (!placementKey) return;
    const state = readPolicyState();
    const nextState = {
        shownCount: state.shownCount + 1,
        lastShownAt: Date.now(),
        lastPlacement: placementKey
    };
    writePolicyState(nextState);
};
