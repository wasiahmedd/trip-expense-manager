import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import MinimalDashboard from './components/MinimalDashboard';
import { auth, hasFirebaseConfig } from './config/firebase';
import { extractTripCodeFromInput } from './utils/tripLink';

const socket = io(
    import.meta.env.VITE_SOCKET_SERVER_URL ||
    (window.location.protocol === 'https:'
        ? `https://${window.location.hostname}:3001`
        : `http://${window.location.hostname}:3001`),
    { transports: ['websocket', 'polling'] }
);

const extractNameFromEmail = (email) => {
    if (!email || !email.includes('@')) return 'Trip User';
    return email.split('@')[0];
};

function App() {
    const isNativePlatform = useMemo(() => Capacitor.isNativePlatform(), []);
    const initialInviteCode = useMemo(() => {
        if (typeof window === 'undefined') return '';
        return extractTripCodeFromInput(window.location.search);
    }, []);

    const [trip, setTrip] = useState(null);
    const [myId, setMyId] = useState('');
    const [savedTrips, setSavedTrips] = useState([]);
    const [profileName, setProfileName] = useState('');
    const [user, setUser] = useState(null);
    const [authReady, setAuthReady] = useState(!hasFirebaseConfig);
    const [error, setError] = useState(null);
    const [notification, setNotification] = useState(null);
    const [inviteCode, setInviteCode] = useState(initialInviteCode);
    const [attemptedInviteCode, setAttemptedInviteCode] = useState('');
    const myIdRef = useRef('');

    const defaultName = useMemo(() => {
        if (profileName.trim()) return profileName.trim();
        if (user?.displayName?.trim()) return user.displayName.trim();
        return extractNameFromEmail(user?.email || '');
    }, [profileName, user]);

    useEffect(() => {
        myIdRef.current = myId;
    }, [myId]);

    useEffect(() => {
        if (!isNativePlatform) return undefined;

        const applyInviteFromUrl = (incomingUrl) => {
            const parsedCode = extractTripCodeFromInput(incomingUrl);
            if (parsedCode.length !== 6) return;
            setInviteCode(parsedCode);
            setAttemptedInviteCode('');
        };

        let listenerHandle = null;
        let alive = true;

        CapacitorApp.getLaunchUrl()
            .then((launch) => {
                if (!alive) return;
                if (launch?.url) {
                    applyInviteFromUrl(launch.url);
                }
            })
            .catch(() => {
                // Ignore launch URL read errors on unsupported platforms.
            });

        CapacitorApp.addListener('appUrlOpen', (event) => {
            applyInviteFromUrl(event?.url || '');
        })
            .then((handle) => {
                listenerHandle = handle;
            })
            .catch(() => {
                // Ignore listener setup failure on unsupported platforms.
            });

        return () => {
            alive = false;
            if (listenerHandle) {
                listenerHandle.remove();
            }
        };
    }, [isNativePlatform]);

    useEffect(() => {
        const handleConnect = () => {
            setError(null);
            if (auth?.currentUser?.uid) {
                socket.emit('get-user-trips', { userUid: auth.currentUser.uid });
            }
        };

        const handleConnectError = () => {
            setError('Cannot connect to server. Make sure "npm run server" is running.');
        };

        const handleTripJoined = ({ trip: joinedTrip, myId: joinedId }) => {
            setTrip(joinedTrip);
            setMyId(joinedId);
            setError(null);
        };

        const handleTripUpdate = (updatedTrip) => {
            setTrip(updatedTrip);
        };

        const handleServerError = (message) => {
            setError(message);
            setTimeout(() => setError(null), 3200);
        };

        const handleNotification = ({ message, involved = [] }) => {
            const participantId = myIdRef.current;
            if (!participantId || involved.length === 0 || involved.includes(participantId)) {
                setNotification(message);
                setTimeout(() => setNotification(null), 3500);
            }
        };

        const handleUserTrips = (trips) => {
            setSavedTrips(Array.isArray(trips) ? trips : []);
        };

        socket.on('connect', handleConnect);
        socket.on('connect_error', handleConnectError);
        socket.on('trip-joined', handleTripJoined);
        socket.on('update-trip', handleTripUpdate);
        socket.on('error', handleServerError);
        socket.on('notification', handleNotification);
        socket.on('user-trips', handleUserTrips);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('connect_error', handleConnectError);
            socket.off('trip-joined', handleTripJoined);
            socket.off('update-trip', handleTripUpdate);
            socket.off('error', handleServerError);
            socket.off('notification', handleNotification);
            socket.off('user-trips', handleUserTrips);
        };
    }, []);

    useEffect(() => {
        if (!hasFirebaseConfig || !auth) return undefined;

        const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
            setUser(nextUser);
            if (nextUser) {
                setProfileName(nextUser.displayName || extractNameFromEmail(nextUser.email || ''));
                socket.emit('get-user-trips', { userUid: nextUser.uid });
            } else {
                setTrip(null);
                setMyId('');
                setSavedTrips([]);
            }
            setAuthReady(true);
        });

        return unsubscribe;
    }, []);

    const persistNameIfNeeded = async (name) => {
        const normalized = (name || '').trim();
        if (!normalized) return defaultName;

        setProfileName(normalized);
        if (auth?.currentUser && auth.currentUser.displayName !== normalized) {
            try {
                await updateProfile(auth.currentUser, { displayName: normalized });
            } catch {
                // Local display name still updates even if profile update fails.
            }
        }

        return normalized;
    };

    const handleCreate = async (userName, tripName) => {
        if (!user?.uid) {
            setError('Please sign in and try again.');
            return;
        }

        const normalizedName = await persistNameIfNeeded(userName);
        socket.emit('create-trip', { userName: normalizedName, userUid: user.uid, tripName });
    };

    const handleJoin = async (userName, code) => {
        if (!user?.uid) {
            setError('Please sign in and try again.');
            return;
        }

        const normalizedCode = extractTripCodeFromInput(code);
        if (normalizedCode.length < 6) {
            setError('Invalid trip link or code.');
            return;
        }

        const normalizedName = await persistNameIfNeeded(userName);
        socket.emit('join-trip', { userName: normalizedName, code: normalizedCode, userUid: user.uid });
    };

    const handleRejoin = (code) => {
        if (!user?.uid) {
            setError('Please sign in and try again.');
            return;
        }

        socket.emit('rejoin-trip', {
            userName: defaultName,
            code: code.trim().toUpperCase(),
            userUid: user.uid
        });
    };

    const handleAddExpense = (expense) => {
        if (!trip?.code) return;
        socket.emit('add-expense', { code: trip.code, expense });
    };

    const handleLeaveTrip = () => {
        setTrip(null);
        setMyId('');
    };

    const handleLogout = async () => {
        if (!auth) return;
        if (isNativePlatform) {
            try {
                await FirebaseAuthentication.signOut();
            } catch {
                // Ignore native sign-out errors and continue with web auth sign-out.
            }
        }
        await signOut(auth);
    };

    useEffect(() => {
        if (!authReady || !user?.uid || trip || !inviteCode) return;
        if (attemptedInviteCode === inviteCode) return;

        setAttemptedInviteCode(inviteCode);
        handleJoin(defaultName, inviteCode);
    }, [authReady, user, trip, inviteCode, attemptedInviteCode, defaultName]);

    useEffect(() => {
        if (!trip?.code || !inviteCode) return;
        if (trip.code !== inviteCode) return;

        setInviteCode('');
        setAttemptedInviteCode('');

        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('trip');
            url.searchParams.delete('code');
            window.history.replaceState({}, '', url.toString());
        }
    }, [trip, inviteCode]);

    return (
        <div style={{ minHeight: '100vh', color: 'var(--text-primary)' }}>
            {error && (
                <div
                    style={{
                        position: 'fixed',
                        top: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#321416',
                        border: '1px solid #6a2b2f',
                        borderRadius: '12px',
                        padding: '10px 16px',
                        zIndex: 300
                    }}
                >
                    {error}
                </div>
            )}

            {notification && (
                <div
                    style={{
                        position: 'fixed',
                        top: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#1a2230',
                        border: '1px solid #435a76',
                        borderRadius: '999px',
                        padding: '10px 16px',
                        color: '#ebf2fb',
                        fontWeight: 700,
                        zIndex: 301
                    }}
                >
                    {notification}
                </div>
            )}

            {!authReady ? (
                <div className="container auth-layout">
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
                        Checking authentication...
                    </div>
                </div>
            ) : !user ? (
                <AuthScreen />
            ) : !trip ? (
                <Onboarding
                    initialName={defaultName}
                    userEmail={user.email || ''}
                    prefillCode={inviteCode}
                    savedTrips={savedTrips}
                    onCreate={handleCreate}
                    onJoin={handleJoin}
                    onRejoin={handleRejoin}
                    onLogout={handleLogout}
                />
            ) : (
                <MinimalDashboard
                    trip={trip}
                    myId={myId}
                    onAddExpense={handleAddExpense}
                    onExitTrip={handleLeaveTrip}
                />
            )}
        </div>
    );
}

export default App;
