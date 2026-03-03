import React, { useEffect, useState } from 'react';

const CopyButton = ({ onCopy, label = 'Copy', buttonClassName = 'btn btn-secondary', ariaLabel }) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return undefined;
        const timeout = setTimeout(() => setCopied(false), 1000);
        return () => clearTimeout(timeout);
    }, [copied]);

    const handleClick = async () => {
        try {
            const result = await onCopy?.();
            if (result !== false) {
                setCopied(true);
            }
        } catch {
            // Parent handler shows errors.
        }
    };

    return (
        <button
            className={`${buttonClassName} copy-anim-btn`}
            onClick={handleClick}
            aria-label={ariaLabel || label}
            type="button"
        >
            <span className="copy-icon-wrap" aria-hidden="true">
                <svg
                    className={`copy-icon copy-icon-clippy ${copied ? 'is-copied' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M5.75 4.75H10.25V1.75H5.75V4.75Z" />
                    <path d="M3.25 2.88379C2.9511 3.05669 2.75 3.37987 2.75 3.75001V13.25C2.75 13.8023 3.19772 14.25 3.75 14.25H12.25C12.8023 14.25 13.25 13.8023 13.25 13.25V3.75001C13.25 3.37987 13.0489 3.05669 12.75 2.88379" />
                </svg>
                <svg
                    className={`copy-icon copy-icon-check ${copied ? 'is-copied' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M13.25 4.75L6 12L2.75 8.75" />
                </svg>
            </span>
            <span>{copied ? 'Copied' : label}</span>
        </button>
    );
};

export default CopyButton;
