import React, { useEffect, useMemo, useState } from 'react';
import { Camera, LogIn, LogOut, Plus, RotateCcw, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const sanitizeCode = (value) => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

const formatDate = (value) => {
    if (!value) return 'Unknown';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';
    return parsed.toLocaleString();
};

const Onboarding = ({ onJoin, onCreate, onRejoin, onLogout, initialName, userEmail, savedTrips = [] }) => {
    const [name, setName] = useState(initialName || '');
    const [code, setCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    const sortedTrips = useMemo(() => {
        return [...savedTrips].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    }, [savedTrips]);

    useEffect(() => {
        let scanner = null;
        if (isScanning) {
            scanner = new Html5QrcodeScanner('reader', {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            });

            scanner.render((decodedText) => {
                setCode(sanitizeCode(decodedText));
                setIsScanning(false);
                scanner.clear();
            }, () => {
                // Ignore scanner errors
            });
        }

        return () => {
            if (scanner) {
                scanner.clear().catch((err) => console.error('Failed to clear scanner', err));
            }
        };
    }, [isScanning]);

    const handleCreate = () => {
        const normalizedName = name.trim();
        if (!normalizedName) return;
        onCreate(normalizedName);
    };

    const handleJoin = () => {
        const normalizedName = name.trim();
        const normalizedCode = sanitizeCode(code);
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
                        <button
                            className="btn btn-primary"
                            onClick={handleCreate}
                            disabled={!name.trim()}
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
                                    onChange={(event) => setCode(sanitizeCode(event.target.value))}
                                    placeholder="6-DIGIT CODE"
                                    maxLength={6}
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
                    </div>
                </div>
            )}
        </div>
    );
};

export default Onboarding;
