import React, { useMemo } from 'react';
import App from './App';
import SiteFooter from './components/SiteFooter';
import AboutPage from './pages/AboutPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ContactPage from './pages/ContactPage';

const normalizePath = (value) => {
    if (!value || typeof value !== 'string') return '/';
    const trimmed = value.replace(/\/+$/, '');
    return trimmed || '/';
};

const routeComponentMap = {
    '/about': AboutPage,
    '/privacy-policy': PrivacyPolicy,
    '/terms': TermsOfService,
    '/contact': ContactPage
};

const RouteShell = () => {
    const routePath = useMemo(() => normalizePath(window.location.pathname), []);
    const StaticPage = routeComponentMap[routePath];

    if (StaticPage) {
        return (
            <div className="info-layout">
                <header className="container info-header">
                    <a href="/" className="info-home-link">TripCash</a>
                </header>
                <main className="container info-main">
                    <StaticPage />
                </main>
                <SiteFooter />
            </div>
        );
    }

    return (
        <div className="main-layout">
            <App />
            <SiteFooter />
        </div>
    );
};

export default RouteShell;
