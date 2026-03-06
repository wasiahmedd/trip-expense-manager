import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
    ChevronLeft,
    IndianRupee,
    Users,
    Send,
    CheckCircle,
    ArrowRight,
    Wallet,
    Share2,
    X,
    FileText,
    Download,
    AlertTriangle,
    Check
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { calculateSettlements } from '../utils/settlementLogic';
import {
    buildTripExpensesCsv,
    buildTripReadableDocument,
    calculateParticipantSummary,
    calculateTripBalances,
    formatTimestamp,
    getExpensePerHead,
    normalizePaidBy,
    normalizeSplitAmong
} from '../utils/expenseUtils';
import { getPersonTheme } from '../utils/personColors';
import { buildTripAppLink, buildTripShareLink } from '../utils/tripLink';
import { canShowInlineAd, registerInlineAdShown } from '../utils/inlineAdPolicy';
import CopyButton from './CopyButton';
import ExpenseSuccessAdCard from './ExpenseSuccessAdCard';
import BalanceAdCard from './BalanceAdCard';
import SettlementAdCard from './SettlementAdCard';

const parseNumber = (value) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value) => `Rs ${value.toFixed(2)}`;

const MinimalDashboard = ({ trip, myId, onAddExpense, onExitTrip }) => {
    const [activeTab, setActiveTab] = useState('entry');
    const [selectedIds, setSelectedIds] = useState([]);
    const [payerAmounts, setPayerAmounts] = useState({});
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [showNotification, setShowNotification] = useState(null);
    const [showExpenseSuccessMessage, setShowExpenseSuccessMessage] = useState(false);
    const [activeInlineAd, setActiveInlineAd] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [splitDisplayMode, setSplitDisplayMode] = useState('color');
    const expenseSuccessTimeoutRef = useRef(null);

    const participantNames = useMemo(
        () => Object.fromEntries(trip.participants.map((participant) => [participant.id, participant.name])),
        [trip.participants]
    );
    const participantIndexById = useMemo(
        () => Object.fromEntries(trip.participants.map((participant, index) => [participant.id, index])),
        [trip.participants]
    );

    const balances = useMemo(() => calculateTripBalances(trip), [trip]);
    const settlements = useMemo(
        () => calculateSettlements(balances, trip.participants),
        [balances, trip.participants]
    );

    const sortedExpenses = useMemo(
        () => [...trip.expenses].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
        [trip.expenses]
    );

    const paidTotals = useMemo(() => {
        const totals = Object.fromEntries(trip.participants.map((participant) => [participant.id, 0]));
        trip.expenses.forEach((expense) => {
            normalizePaidBy(expense).forEach((payer) => {
                if (totals[payer.id] !== undefined) {
                    totals[payer.id] += parseNumber(payer.amount);
                }
            });
        });
        return totals;
    }, [trip.expenses, trip.participants]);

    const totalSpent = useMemo(
        () => trip.expenses.reduce((sum, expense) => sum + parseNumber(expense.amount), 0),
        [trip.expenses]
    );
    const participantSummary = useMemo(() => calculateParticipantSummary(trip), [trip]);
    const documentText = useMemo(
        () => buildTripReadableDocument({ trip, balances, settlements }),
        [trip, balances, settlements]
    );
    const isNativePlatform = useMemo(() => Capacitor.isNativePlatform(), []);
    const adProvider = useMemo(() => (import.meta.env.VITE_AD_PROVIDER || 'adsense').trim().toLowerCase(), []);
    const areInlineAdsEnabled = adProvider === 'adsense' && !isNativePlatform;
    const shareLink = useMemo(() => buildTripShareLink(trip.code), [trip.code]);
    const appShareLink = useMemo(() => buildTripAppLink(trip.code), [trip.code]);
    const inviteMessage = useMemo(() => {
        const titleLine = trip.tripName ? `Trip: ${trip.tripName}` : null;
        return [
            'Join my trip on TripCash.',
            titleLine,
            `Code: ${trip.code}`,
            `App link: ${appShareLink}`,
            `Web link: ${shareLink}`
        ].filter(Boolean).join('\n');
    }, [trip.tripName, trip.code, appShareLink, shareLink]);
    const tripDateRange = useMemo(() => {
        const validDates = trip.expenses
            .map((expense) => new Date(expense?.date || ''))
            .filter((date) => !Number.isNaN(date.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

        if (validDates.length === 0) {
            return 'No entries yet';
        }

        const first = formatTimestamp(validDates[0].toISOString());
        const last = formatTimestamp(validDates[validDates.length - 1].toISOString());
        return `${first} to ${last}`;
    }, [trip.expenses]);
    const mySummary = useMemo(
        () => participantSummary.find((row) => row.id === myId) || null,
        [participantSummary, myId]
    );
    const personalSettlements = useMemo(
        () => settlements.filter((settlement) => settlement.fromId === myId || settlement.toId === myId),
        [settlements, myId]
    );
    const personalSettlementActions = useMemo(() => {
        const relatedExpenseEntries = (otherId) => {
            const entries = [];
            for (const expense of sortedExpenses) {
                const splitIds = normalizeSplitAmong(expense);
                const payerIds = normalizePaidBy(expense).map((payer) => payer.id);
                const involved = new Set([...splitIds, ...payerIds]);
                if (!involved.has(myId) || !involved.has(otherId)) continue;

                const label = expense.description?.trim() || 'General Expense';
                const perHead = splitIds.length > 0 ? parseNumber(expense.amount) / splitIds.length : 0;
                const share = splitIds.includes(otherId) ? perHead : 0;
                entries.push({ label, share });
                if (entries.length === 4) break;
            }
            return entries;
        };

        return personalSettlements.map((settlement) => {
            const isYouPay = settlement.fromId === myId;
            const otherId = isYouPay ? settlement.toId : settlement.fromId;
            const otherName = participantNames[otherId] || (isYouPay ? settlement.to : settlement.from);
            return {
                type: isYouPay ? 'pay' : 'collect',
                otherId,
                otherName,
                amount: settlement.amount,
                relatedEntries: relatedExpenseEntries(otherId)
            };
        });
    }, [personalSettlements, sortedExpenses, myId, participantNames]);

    const payerIds = useMemo(() => Object.keys(payerAmounts), [payerAmounts]);
    const hasMultiplePayers = payerIds.length > 1;
    const amountNumber = parseNumber(amount);
    const payerTotal = payerIds.reduce((sum, payerId) => sum + parseNumber(payerAmounts[payerId]), 0);
    const payerMismatch =
        amountNumber > 0 &&
        payerIds.length > 0 &&
        Math.abs(payerTotal - amountNumber) > 0.01;

    const canSave =
        amountNumber > 0 &&
        selectedIds.length > 0 &&
        payerIds.length > 0 &&
        payerIds.every((payerId) => parseNumber(payerAmounts[payerId]) > 0) &&
        !payerMismatch;

    useEffect(() => {
        return () => {
            if (expenseSuccessTimeoutRef.current) {
                window.clearTimeout(expenseSuccessTimeoutRef.current);
            }
        };
    }, []);

    const alignSinglePayerAmount = (nextPayers) => {
        const nextPayerIds = Object.keys(nextPayers);
        if (nextPayerIds.length !== 1) {
            return nextPayers;
        }

        const onlyPayer = nextPayerIds[0];
        return { ...nextPayers, [onlyPayer]: amount };
    };

    const notify = (text) => {
        setShowNotification(text);
        setTimeout(() => setShowNotification(null), 2200);
    };

    const selectEveryone = () => {
        setSelectedIds(trip.participants.map((participant) => participant.id));
    };

    const clearAll = () => {
        setSelectedIds([]);
        setPayerAmounts({});
        setAmount('');
        setDescription('');
        if (expenseSuccessTimeoutRef.current) {
            window.clearTimeout(expenseSuccessTimeoutRef.current);
        }
        setShowExpenseSuccessMessage(false);
    };

    const toggleParticipant = (personId) => {
        if (selectedIds.includes(personId)) {
            setSelectedIds((prev) => prev.filter((id) => id !== personId));
            setPayerAmounts((prev) => {
                if (!(personId in prev)) return prev;
                const next = { ...prev };
                delete next[personId];
                return alignSinglePayerAmount(next);
            });
            return;
        }

        setSelectedIds((prev) => (prev.includes(personId) ? prev : [...prev, personId]));
    };

    const togglePayer = (event, personId) => {
        event.stopPropagation();
        setSelectedIds((prev) => (prev.includes(personId) ? prev : [...prev, personId]));

        setPayerAmounts((prev) => {
            if (prev[personId] !== undefined) {
                const next = { ...prev };
                delete next[personId];
                return alignSinglePayerAmount(next);
            }

            const next = { ...prev };
            const existingTotal = Object.values(next).reduce((sum, value) => sum + parseNumber(value), 0);
            const remaining = Math.max(amountNumber - existingTotal, 0);
            next[personId] = remaining > 0 ? remaining.toFixed(2) : '';
            return alignSinglePayerAmount(next);
        });
    };

    const splitPayersEqually = () => {
        if (payerIds.length === 0 || amountNumber <= 0) return;

        const share = amountNumber / payerIds.length;
        const next = {};
        let runningTotal = 0;

        payerIds.forEach((payerId, index) => {
            const value = index === payerIds.length - 1
                ? amountNumber - runningTotal
                : Number(share.toFixed(2));
            runningTotal += value;
            next[payerId] = value.toFixed(2);
        });

        setPayerAmounts(next);
    };

    const handleAmountChange = (value) => {
        if (showExpenseSuccessMessage) {
            setShowExpenseSuccessMessage(false);
        }
        setAmount(value);
        if (payerIds.length === 1) {
            const onlyPayer = payerIds[0];
            setPayerAmounts((prev) => ({ ...prev, [onlyPayer]: value }));
        }
    };

    const openEntryTab = () => {
        setActiveTab('entry');
        if (activeInlineAd !== 'expense_confirmation_ad') {
            setActiveInlineAd('');
        }
    };

    const openBalancesTab = () => {
        setActiveTab('balances');
        if (expenseSuccessTimeoutRef.current) {
            window.clearTimeout(expenseSuccessTimeoutRef.current);
        }
        setShowExpenseSuccessMessage(false);
        const placement = settlements.length > 0 ? 'trip_end_settlement_ad' : 'balance_summary_ad';
        if (!areInlineAdsEnabled || !canShowInlineAd(placement)) return;
        setActiveInlineAd(placement);
    };

    const openDocumentTab = () => {
        setActiveTab('document');
        if (expenseSuccessTimeoutRef.current) {
            window.clearTimeout(expenseSuccessTimeoutRef.current);
        }
        setShowExpenseSuccessMessage(false);
        setActiveInlineAd('');
    };

    const onInlineAdRendered = (placement) => {
        if (!placement) return;
        registerInlineAdShown(placement);
    };

    const handleSave = () => {
        if (!canSave) return;

        const paidBy = payerIds
            .map((payerId) => ({ id: payerId, amount: Number(parseNumber(payerAmounts[payerId]).toFixed(2)) }))
            .filter((payer) => payer.amount > 0);

        onAddExpense({
            description: description.trim() || 'General Expense',
            amount: Number(amountNumber.toFixed(2)),
            paidBy,
            splitAmong: [...new Set(selectedIds)]
        });

        setSelectedIds([]);
        setPayerAmounts({});
        setAmount('');
        setDescription('');
        setShowExpenseSuccessMessage(true);
        if (expenseSuccessTimeoutRef.current) {
            window.clearTimeout(expenseSuccessTimeoutRef.current);
        }
        expenseSuccessTimeoutRef.current = window.setTimeout(() => {
            setShowExpenseSuccessMessage(false);
        }, 15000);
        if (areInlineAdsEnabled && canShowInlineAd('expense_confirmation_ad')) {
            setActiveInlineAd('expense_confirmation_ad');
        }
        notify('Spending entry saved');
    };

    const triggerDownload = (content, fileName, type) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    const downloadReadableDocument = () => {
        triggerDownload(
            documentText,
            `trip-${trip.code}-spending-document.txt`,
            'text/plain;charset=utf-8'
        );
        notify('Readable spending document downloaded');
    };

    const downloadExpenseCsv = () => {
        const csv = buildTripExpensesCsv(trip);
        triggerDownload(csv, `trip-${trip.code}-spendings.csv`, 'text/csv;charset=utf-8');
        notify('Expense CSV downloaded');
    };

    const copyDocumentText = async () => {
        try {
            if (!navigator.clipboard) {
                throw new Error('Clipboard unavailable');
            }
            await navigator.clipboard.writeText(documentText);
            notify('Document copied to clipboard');
            return true;
        } catch {
            notify('Copy failed. Please use export.');
            return false;
        }
    };

    const copyShareLink = async () => {
        try {
            if (!navigator.clipboard) {
                throw new Error('Clipboard unavailable');
            }
            const textToCopy = isNativePlatform ? inviteMessage : shareLink;
            await navigator.clipboard.writeText(textToCopy);
            notify(isNativePlatform ? 'Invite text copied' : 'Trip invite link copied');
            return true;
        } catch {
            notify('Could not copy link');
            return false;
        }
    };

    const shareTripLink = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: `Join trip ${trip.code}`,
                    text: inviteMessage,
                    url: shareLink
                });
                return;
            }
            await copyShareLink();
        } catch {
            // Ignore user-cancelled share.
        }
    };

    const splitDisplayLabels = {
        plain: 'Names',
        tags: 'Tags',
        color: 'Color Tags'
    };

    const cycleSplitDisplayMode = () => {
        setSplitDisplayMode((prev) => {
            if (prev === 'plain') return 'tags';
            if (prev === 'tags') return 'color';
            return 'plain';
        });
    };

    const renderSplitAmong = (personIds) => {
        if (!personIds.length) return 'N/A';
        if (splitDisplayMode === 'plain') {
            return personIds.map((personId) => participantNames[personId] || 'Unknown').join(', ');
        }

        return (
            <span className="split-tags-wrap">
                {personIds.map((personId) => {
                    const name = participantNames[personId] || 'Unknown';
                    if (splitDisplayMode !== 'color') {
                        return (
                            <span key={`split-tag-${personId}`} className="split-tag split-tag-neutral">
                                {name}
                            </span>
                        );
                    }

                    const theme = getPersonTheme(participantIndexById[personId] || 0);
                    return (
                        <span
                            key={`split-tag-${personId}`}
                            className="split-tag split-tag-color"
                            style={{ background: theme.light, borderColor: theme.accent, color: theme.lightText }}
                        >
                            {name}
                        </span>
                    );
                })}
            </span>
        );
    };

    const renderPayerTags = (expense) => {
        const payers = normalizePaidBy(expense);
        if (!payers.length) return 'N/A';

        return (
            <span className="payer-tags-wrap">
                {payers.map((payer, index) => {
                    const name = participantNames[payer.id] || 'Unknown';
                    const theme = getPersonTheme(participantIndexById[payer.id] || index);
                    return (
                        <span
                            key={`payer-tag-${expense.id || 'entry'}-${payer.id}-${index}`}
                            className="payer-tag"
                            style={{ background: theme.light, color: theme.lightText }}
                        >
                            <span>{name}</span>
                            <span className="payer-tag-amount">{money(payer.amount)}</span>
                        </span>
                    );
                })}
            </span>
        );
    };

    return (
        <div className="container dashboard-shell">
            <header className="dashboard-header">
                <button className="btn btn-secondary" onClick={onExitTrip} style={{ padding: '8px 10px' }}>
                    <ChevronLeft size={14} /> Trips
                </button>

                <div className="trip-chip">
                    <span>{trip.tripName ? `${trip.tripName} | ${trip.code}` : `TRIP CODE ${trip.code}`}</span>
                    <button onClick={() => setShowQR(true)} aria-label="Share trip code">
                        <Share2 size={14} />
                    </button>
                </div>
            </header>

            {showQR && (
                <div className="modal-overlay" onClick={() => setShowQR(false)}>
                    <div className="modal-content" onClick={(event) => event.stopPropagation()}>
                        <button className="modal-close" onClick={() => setShowQR(false)} aria-label="Close">
                            <X size={24} />
                        </button>
                        <h2>{trip.tripName ? `Share ${trip.tripName}` : 'Share Trip Link'}</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Scan or open this link to join directly.</p>
                        <div className="qr-container"><QRCodeSVG value={shareLink} size={200} /></div>
                        <p style={{ marginTop: '10px', fontWeight: 800, letterSpacing: '2px' }}>{trip.code}</p>
                        <div className="share-link-box">
                            {isNativePlatform && (
                                <>
                                    <p className="share-link-label">App Deep Link</p>
                                    <input value={appShareLink} readOnly />
                                </>
                            )}
                            <p className="share-link-label">Web Link</p>
                            <input value={shareLink} readOnly />
                            <div className="share-link-actions">
                                <CopyButton onCopy={copyShareLink} label={isNativePlatform ? 'Copy Invite' : 'Copy Link'} />
                                <button className="btn btn-primary" onClick={shareTripLink}>
                                    <Share2 size={15} /> Share
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main className="dashboard-main">
                {activeTab === 'entry' && (
                    <>
                        <div>
                            <h3 className="section-title">PEOPLE INVOLVED</h3>
                            <p className="section-subtitle">Select split participants and one or many payers with contribution.</p>
                        </div>

                        <div className="entry-progress">
                            <div className={`progress-chip ${selectedIds.length > 0 ? 'done' : ''}`}>
                                {selectedIds.length > 0 ? <Check size={12} /> : '1'}. Split People
                            </div>
                            <div className={`progress-chip ${payerIds.length > 0 ? 'done' : ''}`}>
                                {payerIds.length > 0 ? <Check size={12} /> : '2'}. Payer
                            </div>
                            <div className={`progress-chip ${amountNumber > 0 ? 'done' : ''}`}>
                                {amountNumber > 0 ? <Check size={12} /> : '3'}. Amount
                            </div>
                        </div>

                        <div className="quick-actions">
                            <button className="btn btn-secondary" onClick={selectEveryone}>Select Everyone</button>
                            <button className="btn btn-secondary" onClick={clearAll}>Reset</button>
                        </div>

                        {showExpenseSuccessMessage && (
                            <section className="glass-panel expense-success-panel">
                                <p className="expense-success-message">
                                    <CheckCircle size={16} /> Spending entry saved successfully.
                                </p>
                                {activeInlineAd === 'expense_confirmation_ad' && (
                                    <ExpenseSuccessAdCard onAdRendered={() => onInlineAdRendered('expense_confirmation_ad')} />
                                )}
                            </section>
                        )}

                        {trip.participants.map((participant, index) => {
                            const theme = getPersonTheme(index);
                            const isSelected = selectedIds.includes(participant.id);
                            const isPayer = payerAmounts[participant.id] !== undefined;

                            return (
                                <div
                                    key={participant.id}
                                    className={`person-row ${isSelected ? 'row-selected' : 'row-muted'} ${isPayer ? 'payer-selected' : ''}`}
                                    onClick={() => toggleParticipant(participant.id)}
                                    style={{
                                        '--payer-accent': theme.rich,
                                        background: isSelected ? theme.rich : theme.light,
                                        color: isSelected ? theme.text : theme.lightText
                                    }}
                                >
                                    <div className="person-row-head">
                                        <div className="person-head-left">
                                            <span className={`selection-dot ${isSelected ? 'selected' : ''}`}>
                                                {isSelected && <Check size={12} />}
                                            </span>
                                            <p className="person-name">{participant.name} {participant.id === myId ? '(You)' : ''}</p>
                                            <span className={`status-chip ${isSelected ? 'selected' : 'not-selected'}`}>
                                                {isSelected ? 'Selected' : 'Not selected'}
                                            </span>
                                        </div>
                                        <button
                                            className="payer-toggle"
                                            onClick={(event) => togglePayer(event, participant.id)}
                                            style={{ background: isPayer ? 'rgba(0, 0, 0, 0.32)' : 'rgba(255, 255, 255, 0.20)' }}
                                            aria-label={`Toggle payer for ${participant.name}`}
                                        >
                                            <IndianRupee size={16} className={isPayer ? 'payer-icon-anim' : ''} />
                                        </button>
                                    </div>

                                    {isPayer && hasMultiplePayers && (
                                        <div className="payer-entry" onClick={(event) => event.stopPropagation()}>
                                            <span>Contributed</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={payerAmounts[participant.id]}
                                                onChange={(event) => setPayerAmounts((prev) => ({ ...prev, [participant.id]: event.target.value }))}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        <section className="glass-panel form-panel">
                            <div className="field-wrap">
                                <label htmlFor="expense-description">Description</label>
                                <input
                                    id="expense-description"
                                    type="text"
                                    placeholder="Dinner, cab, hotel"
                                    value={description}
                                    onChange={(event) => {
                                        if (showExpenseSuccessMessage) {
                                            setShowExpenseSuccessMessage(false);
                                        }
                                        setDescription(event.target.value);
                                    }}
                                />
                            </div>
                            <div className="amount-wrap">
                                <label htmlFor="expense-amount">Total Amount</label>
                                <IndianRupee size={18} />
                                <input
                                    id="expense-amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="Total amount"
                                    value={amount}
                                    onChange={(event) => handleAmountChange(event.target.value)}
                                />
                            </div>
                            <div className="amount-quick-grid">
                                {[100, 200, 500, 1000].map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        type="button"
                                        className="amount-quick-btn"
                                        onClick={() => handleAmountChange(String(quickAmount))}
                                    >
                                        {quickAmount}
                                    </button>
                                ))}
                            </div>

                            {hasMultiplePayers && (
                                <button className="btn btn-secondary" onClick={splitPayersEqually}>
                                    Split amount equally across payers
                                </button>
                            )}

                            <div className="payer-total" style={{ color: payerMismatch ? 'var(--danger)' : 'var(--text-secondary)' }}>
                                <span>Payer total</span>
                                <span>{money(payerTotal)} / {money(amountNumber)}</span>
                            </div>

                            {payerMismatch && (
                                <div className="error-inline"><AlertTriangle size={16} />Payer contributions must match total amount.</div>
                            )}

                            <button className="btn btn-primary" onClick={handleSave} disabled={!canSave}>
                                <Send size={16} /> Save Spending Entry
                            </button>
                        </section>
                    </>
                )}

                {activeTab === 'balances' && (
                    <>
                        <div className="glass-panel balance-top">
                            <div>
                                <p>Total Group Spend</p>
                                <h2>{money(totalSpent)}</h2>
                            </div>
                            <Wallet size={24} color="var(--text-secondary)" />
                        </div>
                        {activeInlineAd === 'balance_summary_ad' && (
                            <BalanceAdCard onAdRendered={() => onInlineAdRendered('balance_summary_ad')} />
                        )}

                        <h3 className="section-title">WHO SPENT HOW MUCH</h3>
                        {trip.participants.map((participant, index) => {
                            const theme = getPersonTheme(index);
                            const spent = paidTotals[participant.id] || 0;
                            return (
                                <div key={`spent-${participant.id}`} className="balance-row" style={{ background: theme.light, color: theme.lightText }}>
                                    <span>{participant.name}</span>
                                    <strong style={{ color: '#121212' }}>{money(spent)}</strong>
                                </div>
                            );
                        })}

                        <h3 className="section-title">SETTLEMENT PLAN</h3>
                        {settlements.length > 0 ? settlements.map((settlement, index) => (
                            <div key={`${settlement.from}-${settlement.to}-${index}`} className="glass-panel settlement-row">
                                <span>{settlement.from}</span>
                                <ArrowRight size={14} />
                                <span>{settlement.to}</span>
                                <strong>{money(settlement.amount)}</strong>
                            </div>
                        )) : (
                            <div className="glass-panel" style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                                Everyone is settled.
                            </div>
                        )}
                        {activeInlineAd === 'trip_end_settlement_ad' && (
                            <SettlementAdCard onAdRendered={() => onInlineAdRendered('trip_end_settlement_ad')} />
                        )}

                        <h3 className="section-title">FOR YOU: WHO TO PAY / WHO PAYS YOU</h3>
                        <div className="glass-panel my-settlement-summary">
                            <p>
                                {mySummary
                                    ? `You paid ${money(mySummary.paid)}, your share is ${money(mySummary.share)}, so your net is ${mySummary.net >= 0 ? '+' : ''}${money(mySummary.net)}.`
                                    : 'Join a trip to see your personal settlement summary.'}
                            </p>
                        </div>
                        {personalSettlementActions.length > 0 ? personalSettlementActions.map((action, index) => (
                            <div
                                key={`my-settlement-${action.type}-${action.otherId || index}`}
                                className={`glass-panel my-settlement-row ${action.type === 'pay' ? 'my-settlement-pay' : 'my-settlement-collect'}`}
                            >
                                <div className="my-settlement-main">
                                    <p className="my-settlement-title">
                                        {action.type === 'pay'
                                            ? `You should pay ${action.otherName}`
                                            : `${action.otherName} should pay you`}
                                    </p>
                                    <strong>{money(action.amount)}</strong>
                                </div>
                                {action.relatedEntries.length > 0 && (
                                    <div className="my-settlement-entry-tags">
                                        {action.relatedEntries.map((entry, tagIndex) => (
                                            <span key={`entry-tag-${action.otherId || 'x'}-${tagIndex}`} className="my-settlement-entry-tag">
                                                {entry.label} • Share {money(entry.share)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="glass-panel" style={{ padding: '14px', color: 'var(--text-secondary)' }}>
                                No pending settlement for you right now.
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'document' && (
                    <>
                        <div className="glass-panel doc-head">
                            <div>
                                <h3>Trip Spending Document</h3>
                                <p>Simple summary for non-technical users. View here or export as text/CSV.</p>
                            </div>
                            <div className="doc-actions">
                                <CopyButton onCopy={copyDocumentText} label="Copy" />
                                <button className="btn btn-secondary" onClick={downloadReadableDocument}>
                                    <Download size={16} /> TXT
                                </button>
                                <button className="btn btn-secondary" onClick={downloadExpenseCsv}>
                                    <Download size={16} /> CSV
                                </button>
                            </div>
                        </div>

                        <div className="doc-overview-grid">
                            <div className="glass-panel doc-stat-card">
                                <p>Total Spent</p>
                                <strong>{money(totalSpent)}</strong>
                            </div>
                            <div className="glass-panel doc-stat-card">
                                <p>Expense Entries</p>
                                <strong>{sortedExpenses.length}</strong>
                            </div>
                            <div className="glass-panel doc-stat-card">
                                <p>Participants</p>
                                <strong>{trip.participants.length}</strong>
                            </div>
                            <div className="glass-panel doc-stat-card">
                                <p>Trip Timeline</p>
                                <strong>{tripDateRange}</strong>
                            </div>
                        </div>

                        <div className="glass-panel doc-summary-panel">
                            <div className="doc-summary-headline">
                                <h3>Person-wise Summary</h3>
                                <p>Paid = how much person spent. Share = how much they should pay. Net = Paid - Share.</p>
                            </div>
                            <div className="doc-summary-row doc-summary-row-head">
                                <span>Person</span>
                                <span>Paid</span>
                                <span>Share</span>
                                <span>Net</span>
                            </div>
                            {participantSummary.map((row) => (
                                <div key={`doc-summary-${row.id}`} className="doc-summary-row">
                                    <span>{row.name}</span>
                                    <span>{money(row.paid)}</span>
                                    <span>{money(row.share)}</span>
                                    <span
                                        className={row.net >= 0 ? 'doc-net-positive' : 'doc-net-negative'}
                                    >
                                        {row.net >= 0 ? '+' : ''}{money(row.net)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="timeline-head">
                            <h3 className="section-title">EXPENSE TIMELINE</h3>
                            <button className="split-view-toggle" onClick={cycleSplitDisplayMode}>
                                Split View: {splitDisplayLabels[splitDisplayMode]}
                            </button>
                        </div>
                        {sortedExpenses.length === 0 && (
                            <div className="glass-panel" style={{ padding: '20px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                No spending records yet.
                            </div>
                        )}

                        {sortedExpenses.map((expense, index) => {
                            const splitIds = normalizeSplitAmong(expense);
                            return (
                                <div key={expense.id || index} className="glass-panel doc-row">
                                    <div className="doc-row-top">
                                        <div>
                                            <p className="doc-title">
                                                #{sortedExpenses.length - index} {expense.description || 'General Expense'}
                                            </p>
                                            <p className="doc-time">{formatTimestamp(expense.date)}</p>
                                        </div>
                                        <strong>{money(parseNumber(expense.amount))}</strong>
                                    </div>
                                    <p><strong>Paid by:</strong> {renderPayerTags(expense)}</p>
                                    <p><strong>Split among:</strong> {renderSplitAmong(splitIds)}</p>
                                    <p><strong>Per head:</strong> {money(getExpensePerHead(expense))}</p>
                                </div>
                            );
                        })}
                    </>
                )}
            </main>

            {showNotification && (
                <div className="toast"><CheckCircle size={16} /> {showNotification}</div>
            )}

            <nav className="glass-panel bottom-nav">
                <button onClick={openEntryTab} className={activeTab === 'entry' ? 'active' : ''}><Users size={20} /><span>Entry</span></button>
                <button onClick={openBalancesTab} className={activeTab === 'balances' ? 'active' : ''}><IndianRupee size={20} /><span>Balances</span></button>
                <button onClick={openDocumentTab} className={activeTab === 'document' ? 'active' : ''}><FileText size={20} /><span>Document</span></button>
            </nav>
        </div>
    );
};

export default MinimalDashboard;
