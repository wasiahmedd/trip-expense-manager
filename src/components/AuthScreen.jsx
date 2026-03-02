import React, { useMemo, useState } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithRedirect,
    signInWithPopup,
    updateProfile
} from 'firebase/auth';
import { Lock, LogIn, Mail, User, UserPlus } from 'lucide-react';
import { auth, googleProvider, hasFirebaseConfig } from '../config/firebase';

const extractNameFromEmail = (email) => {
    if (!email || !email.includes('@')) return 'Trip User';
    return email.split('@')[0];
};

const AuthScreen = () => {
    const [mode, setMode] = useState('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState('');

    const modeText = useMemo(() => {
        return mode === 'login'
            ? { title: 'Welcome Back', action: 'Log In', alt: 'Create account', busy: 'Logging in...' }
            : { title: 'Create Account', action: 'Sign Up', alt: 'Already have account?', busy: 'Creating account...' };
    }, [mode]);

    const mapError = (message) => {
        if (!message) return 'Authentication failed.';
        if (message.includes('auth/invalid-credential')) return 'Email or password is incorrect.';
        if (message.includes('auth/email-already-in-use')) return 'This email is already registered.';
        if (message.includes('auth/weak-password')) return 'Password should be at least 6 characters.';
        if (message.includes('auth/configuration-not-found')) {
            return 'Firebase auth provider is not configured. Enable Email/Password and Google in Firebase Authentication, then restart the app.';
        }
        if (message.includes('auth/popup-blocked')) return 'Popup blocked. Allow popups and try Google login again.';
        return message.replace('Firebase: ', '');
    };

    const handleEmailAuth = async (event) => {
        event.preventDefault();
        if (!hasFirebaseConfig || !auth) return;

        setError('');
        setIsBusy(true);

        try {
            if (mode === 'signup') {
                const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
                const fallbackName = extractNameFromEmail(credential.user.email || '');
                await updateProfile(credential.user, { displayName: name.trim() || fallbackName });
            } else {
                await signInWithEmailAndPassword(auth, email.trim(), password);
            }
        } catch (err) {
            setError(mapError(err?.message));
        } finally {
            setIsBusy(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!hasFirebaseConfig || !auth || !googleProvider) return;

        setError('');
        setIsBusy(true);
        try {
            const credential = await signInWithPopup(auth, googleProvider);
            if (!credential.user.displayName) {
                const fallbackName = extractNameFromEmail(credential.user.email || '');
                await updateProfile(credential.user, { displayName: fallbackName });
            }
        } catch (err) {
            const message = String(err?.message || '');
            if (message.includes('auth/popup-blocked') || message.includes('auth/operation-not-supported-in-this-environment')) {
                await signInWithRedirect(auth, googleProvider);
                return;
            }
            setError(mapError(message));
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="container auth-layout animate-slide-up">
            <div className="auth-card glass-panel">
                <h1>{modeText.title}</h1>
                <p>Sign in to save your created and joined trips.</p>

                {!hasFirebaseConfig && (
                    <div className="auth-alert">
                        Firebase config missing. Add `VITE_FIREBASE_*` values in `.env` to enable login.
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="auth-form">
                    {mode === 'signup' && (
                        <div className="field-wrap">
                            <label htmlFor="auth-name">Name</label>
                            <div className="input-with-icon">
                                <User size={16} />
                                <input
                                    id="auth-name"
                                    type="text"
                                    placeholder="Your name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    disabled={isBusy || !hasFirebaseConfig}
                                />
                            </div>
                        </div>
                    )}

                    <div className="field-wrap">
                        <label htmlFor="auth-email">Email</label>
                        <div className="input-with-icon">
                            <Mail size={16} />
                            <input
                                id="auth-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                disabled={isBusy || !hasFirebaseConfig}
                                required
                            />
                        </div>
                    </div>

                    <div className="field-wrap">
                        <label htmlFor="auth-password">Password</label>
                        <div className="input-with-icon">
                            <Lock size={16} />
                            <input
                                id="auth-password"
                                type="password"
                                placeholder="At least 6 characters"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                disabled={isBusy || !hasFirebaseConfig}
                                minLength={6}
                                required
                            />
                        </div>
                    </div>

                    {error && <div className="auth-alert">{error}</div>}

                    <button className="btn btn-primary" type="submit" disabled={isBusy || !hasFirebaseConfig}>
                        {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
                        {isBusy ? modeText.busy : modeText.action}
                    </button>
                </form>

                <div className="auth-divider"><span>or</span></div>

                <button className="btn btn-secondary auth-google-btn" onClick={handleGoogleLogin} disabled={isBusy || !hasFirebaseConfig}>
                    <img
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                        alt="Google"
                        width="16"
                        height="16"
                    />
                    Continue with Google
                </button>

                <button
                    className="btn auth-link-btn"
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    disabled={isBusy}
                >
                    {mode === 'login' ? 'No account? Create one' : 'Already have account? Log in'}
                </button>
            </div>
        </div>
    );
};

export default AuthScreen;
