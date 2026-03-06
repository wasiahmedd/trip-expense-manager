import React from 'react';

const footerLinks = [
    { label: 'About', path: '/about' },
    { label: 'Privacy Policy', path: '/privacy-policy' },
    { label: 'Terms', path: '/terms' },
    { label: 'Contact', path: '/contact' }
];

const SiteFooter = () => {
    return (
        <footer className="site-footer">
            <div className="container site-footer-inner">
                <nav className="site-footer-links" aria-label="Legal and informational links">
                    {footerLinks.map((link) => (
                        <a key={link.path} href={link.path}>
                            {link.label}
                        </a>
                    ))}
                </nav>
                <p className="site-footer-note">
                    TripCash is a lightweight shared-expense tool. Ads may support free access.
                </p>
            </div>
        </footer>
    );
};

export default SiteFooter;
