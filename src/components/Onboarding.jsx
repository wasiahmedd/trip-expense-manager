import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, LogIn, LogOut, Plus, RotateCcw, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { extractTripCodeFromInput } from '../utils/tripLink';

const formatDate = (value) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';
    return parsed.toLocaleString();
};

const Onboarding = ({ onJoin, onCreate, onRejoin, onLogout, initialName, userEmail, savedTrips = [], prefillCode = '' }) => {
    const [name, setName] = useState(initialName || '');
    const [tripName, setTripName] = useState('');
    const [code, setCode] = useState(extractTripCodeFromInput(prefillCode));
    const [isJoining, setIsJoining] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannerError, setScannerError] = useState('');
    const scannerRef = useRef(null);

    const sortedTrips = useMemo(() => {
        return [...savedTrips].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }, [savedTrips]);

    const stopScanner = useCallback(async () => {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (!scanner) return;

        try {
            if (scanner.isScanning) {
                await scanner.stop();
            }
        } catch {
            // Ignore stop errors during teardown.
        }

        try {
            await scanner.clear();
        } catch {
            // Ignore clear errors during teardown.
        }
    }, []);

    const mapScannerError = (error) => {
        const message = String(error?.message || error || '');
        if (message.includes('NotAllowedError')) {
            return 'Camera permission denied. Enable camera permission for TripCash in Android app settings.';
        }
        if (message.includes('NotFoundError') || message.includes('OverconstrainedError')) {
            return 'No usable camera found on this device.';
        }
        if (message.includes('NotReadableError')) {
            return 'Camera is busy in another app. Close other camera apps and try again.';
        }
        if (message.includes('insecure context')) {
            return 'Camera requires secure context. Please use the installed app build.';
        }
        return 'Could not start QR scanner. Please paste trip link/code manually.';
    };

    useEffect(() => {
        if (!isScanning) {
            stopScanner();
            return undefined;
        }

        let alive = true;
        setScannerError('');

        const startScanner = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error('MediaDevices API not available');
                }

                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach((track) => track.stop());

                if (!alive) return;

                const scanner = new Html5Qrcode('reader');
                scannerRef.current = scanner;
                await scanner.start(
                    { facingMode: 'environment' },
                    { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                    (decodedText) => {
                        setCode(extractTripCodeFromInput(decodedText));
                        setIsScanning(false);
                    },
                    () => {
                        // Ignore scan misses.
                    }
                );
            } catch (err) {
                if (!alive) return;
                setScannerError(mapScannerError(err));
                stopScanner();
            }
        };

        startScanner();

        return () => {
            alive = false;
            stopScanner();
        };
    }, [isScanning, stopScanner]);

    useEffect(() => {
        const parsed = extractTripCodeFromInput(prefillCode);
        if (parsed.length === 6) {
            setCode(parsed);
            setIsJoining(true);
        }
    }, [prefillCode]);

    const handleCreate = () => {
        const normalizedName = name.trim();
        const normalizedTripName = tripName.trim();
        if (!normalizedName || !normalizedTripName) return;
        onCreate(normalizedName, normalizedTripName);
    };

    const handleJoin = () => {
        const normalizedName = name.trim();
        const normalizedCode = extractTripCodeFromInput(code);
        if (!normalizedName || normalizedCode.length < 6) return;
        onJoin(normalizedName, normalizedCode);
    };

    return (
        <div
            className="container animate-slide-up"
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '32px',
                maxWidth: '560px'
            }}
        >
            <header style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h1 style={{ fontSize: '44px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                    TripCash
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>Shared trip expense manager</p>
            </header>

            <div className="glass-panel account-chip">
                <div>
                    <p>Signed in as</p>
                    <strong>{userEmail || 'Unknown user'}</strong>
                </div>
                <button className="btn btn-secondary account-logout-btn" onClick={onLogout} aria-label="Logout">
                    <LogOut size={16} />
                    <span className="account-logout-text">Logout</span>
                </button>
            </div>

            <div className="glass-panel" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Your Trip Name</label>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="e.g. Alice"
                    />
                </div>

                {!isJoining ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Trip Name</label>
                            <input
                                value={tripName}
                                onChange={(event) => setTripName(event.target.value)}
                                placeholder="e.g. Goa Friends Trip"
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreate}
                            disabled={!name.trim() || !tripName.trim()}
                            style={{ justifyContent: 'center' }}
                        >
                            <Plus size={20} /> Create New Trip
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setIsJoining(true)}
                            style={{ justifyContent: 'center' }}
                        >
                            Join Existing Trip
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Trip Code</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    value={code}
                                    onChange={(event) => setCode(extractTripCodeFromInput(event.target.value))}
                                    placeholder="Trip code or invite link"
                                    style={{ width: '100%', textAlign: 'center', letterSpacing: '4px', fontSize: '20px', paddingRight: '48px' }}
                                />
                                <button
                                    onClick={() => setIsScanning(true)}
                                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: '#161a20', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}
                                >
                                    <Camera size={20} />
                                </button>
                            </div>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={handleJoin}
                            disabled={!name.trim() || code.length < 6}
                            style={{ justifyContent: 'center' }}
                        >
                            <LogIn size={20} /> Join Trip
                        </button>
                        <button
                            className="btn"
                            onClick={() => setIsJoining(false)}
                            style={{ justifyContent: 'center', fontSize: '14px', opacity: 0.7 }}
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>

            {sortedTrips.length > 0 && (
                <div className="glass-panel saved-trips-panel">
                    <div className="saved-trips-head">
                        <h3>Saved Trips</h3>
                        <span>{sortedTrips.length}</span>
                    </div>
                    <div className="saved-trips-list">
                        {sortedTrips.map((savedTrip) => (
                            <div key={`${savedTrip.code}-${savedTrip.role}`} className="saved-trip-row">
                                <div>
                                    {savedTrip.tripName && <p className="saved-trip-name">{savedTrip.tripName}</p>}
                                    <p className="saved-trip-code">{savedTrip.code}</p>
                                    <p className="saved-trip-meta">
                                        {savedTrip.role === 'created' ? 'Created by you' : 'Joined'} | {savedTrip.participantsCount} members
                                    </p>
                                    <p className="saved-trip-meta">Updated: {formatDate(savedTrip.updatedAt)}</p>
                                </div>
                                <button className="btn btn-secondary" onClick={() => onRejoin(savedTrip.code)}>
                                    <RotateCcw size={14} /> Open
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isScanning && (
                <div className="modal-overlay" onClick={() => setIsScanning(false)}>
                    <div className="modal-content" onClick={(event) => event.stopPropagation()}>
                        <button
                            onClick={() => setIsScanning(false)}
                            style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', zIndex: 10 }}
                        >
                            <X size={24} />
                        </button>
                        <h2 style={{ marginBottom: '16px' }}>Scan QR Code</h2>
                        <div className="scanner-container">
                            <div id="reader"></div>
                        </div>
                        <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>Center the QR code in the box to scan</p>
                        {scannerError && <p className="scanner-error">{scannerError}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Onboarding;
