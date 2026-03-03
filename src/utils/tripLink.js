const sanitizeTripCode = (value) =>
  String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);

const isStrictTripCode = (value) => /^[A-Z0-9]{6}$/.test(String(value || '').toUpperCase());

const pickCodeCandidate = (url) => {
  const tripParam = url.searchParams.get('trip') || url.searchParams.get('code');
  if (tripParam) return tripParam;

  const pathParts = url.pathname.split('/').filter(Boolean).reverse();
  const exactCodePart = pathParts.find((part) => isStrictTripCode(part));
  if (exactCodePart) return exactCodePart;

  return '';
};

const buildQueryLink = (baseUrl, tripCode) => {
  const url = new URL(baseUrl);
  url.searchParams.set('trip', tripCode);
  return url.toString();
};

export const extractTripCodeFromInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (isStrictTripCode(raw)) {
    return sanitizeTripCode(raw);
  }

  const looksLikeUrl = raw.includes('://') || raw.includes('?') || raw.includes('/') || raw.includes('.');
  if (!looksLikeUrl) {
    return sanitizeTripCode(raw);
  }

  try {
    const url = new URL(raw);
    const code = sanitizeTripCode(pickCodeCandidate(url));
    return code.length === 6 ? code : '';
  } catch {
    if (typeof window === 'undefined') {
      return sanitizeTripCode(raw);
    }

    try {
      const normalized = raw.startsWith('/') ? raw : `/${raw}`;
      const url = new URL(normalized, window.location.origin);
      const code = sanitizeTripCode(pickCodeCandidate(url));
      return code.length === 6 ? code : '';
    } catch {
      return sanitizeTripCode(raw);
    }
  }
};

export const buildTripShareLink = (tripCode) => {
  const normalizedCode = sanitizeTripCode(tripCode);
  const configuredBase = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  let baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (configuredBase) {
    try {
      const normalizedBase = configuredBase.startsWith('http')
        ? configuredBase
        : `https://${configuredBase}`;
      baseUrl = new URL(normalizedBase).origin;
    } catch {
      // Fall back to current origin.
    }
  }

  if (!normalizedCode) return baseUrl;
  if (!baseUrl) return `?trip=${normalizedCode}`;

  return buildQueryLink(baseUrl, normalizedCode);
};

export const buildTripAppLink = (tripCode) => {
  const normalizedCode = sanitizeTripCode(tripCode);
  const baseLink = 'tripcash://join';
  if (!normalizedCode) return baseLink;
  return buildQueryLink(baseLink, normalizedCode);
};
