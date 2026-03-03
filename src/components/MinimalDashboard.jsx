import React, { useMemo, useState } from 'react';
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
    buildTripReport,
    calculateTripBalances,
    formatTimestamp,
    getExpensePerHead,
    normalizePaidBy,
    normalizeSplitAmong
} from '../utils/expenseUtils';
import { getPersonTheme } from '../utils/personColors';

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
    const [showQR, setShowQR] = useState(false);

    const participantNames = useMemo(
        () => Object.fromEntries(trip.participants.map((participant) => [participant.id, participant.name])),
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
        setAmount(value);
        if (payerIds.length === 1) {
            const onlyPayer = payerIds[0];
            setPayerAmounts((prev) => ({ ...prev, [onlyPayer]: value }));
        }
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
        notify('Spending entry saved');
    };

    const downloadReport = () => {
        const report = buildTripReport({ trip, balances, settlements });
        const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `trip-${trip.code}-spending-document.md`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        notify('Detailed spending document downloaded');
    };

    return (
        <div className="container dashboard-shell">
            <header className="dashboard-header">
                <button className="btn btn-secondary" onClick={onExitTrip} style={{ padding: '8px 10px' }}>
                    <ChevronLeft size={14} /> Trips
                </button>

                <div className="trip-chip">
                    <span>TRIP CODE {trip.code}</span>
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
                        <h2>Share Trip</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Scan this QR to join</p>
                        <div className="qr-container"><QRCodeSVG value={trip.code} size={200} /></div>
                        <p style={{ marginTop: '12px', fontWeight: 800, letterSpacing: '2px' }}>{trip.code}</p>
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
                                    onChange={(event) => setDescription(event.target.value)}
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

                        <h3 className="section-title">CURRENT BALANCES</h3>
                        {trip.participants.map((participant, index) => {
                            const theme = getPersonTheme(index);
                            const balance = balances[participant.id] || 0;
                            return (
                                <div key={participant.id} className="balance-row" style={{ background: theme.bg, borderColor: theme.accent }}>
                                    <span style={{ color: theme.text }}>{participant.name}</span>
                                    <strong style={{ color: balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        {balance >= 0 ? '+' : ''}{money(balance)}
                                    </strong>
                                </div>
                            );
                        })}

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
                    </>
                )}

                {activeTab === 'document' && (
                    <>
                        <div className="glass-panel doc-head">
                            <div>
                                <h3>Spending Document</h3>
                                <p>Auto-updated with timing, amount, payer split, and participants.</p>
                            </div>
                            <button className="btn btn-secondary" onClick={downloadReport}>
                                <Download size={16} /> Export
                            </button>
                        </div>

                        {sortedExpenses.length === 0 && (
                            <div className="glass-panel" style={{ padding: '20px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                No spending records yet.
                            </div>
                        )}

                        {sortedExpenses.map((expense, index) => {
                            const payers = normalizePaidBy(expense)
                                .map((payer) => `${participantNames[payer.id] || 'Unknown'} (${money(payer.amount)})`)
                                .join(', ');
                            const split = normalizeSplitAmong(expense)
                                .map((personId) => participantNames[personId] || 'Unknown')
                                .join(', ');
                            return (
                                <div key={expense.id || index} className="glass-panel doc-row">
                                    <div className="doc-row-top">
                                        <div>
                                            <p className="doc-title">{expense.description || 'General Expense'}</p>
                                            <p className="doc-time">{formatTimestamp(expense.date)}</p>
                                        </div>
                                        <strong>{money(parseNumber(expense.amount))}</strong>
                                    </div>
                                    <p><strong>Paid by:</strong> {payers || 'N/A'}</p>
                                    <p><strong>Split among:</strong> {split || 'N/A'}</p>
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
                <button onClick={() => setActiveTab('entry')} className={activeTab === 'entry' ? 'active' : ''}><Users size={20} /><span>Entry</span></button>
                <button onClick={() => setActiveTab('balances')} className={activeTab === 'balances' ? 'active' : ''}><IndianRupee size={20} /><span>Balances</span></button>
                <button onClick={() => setActiveTab('document')} className={activeTab === 'document' ? 'active' : ''}><FileText size={20} /><span>Document</span></button>
            </nav>
        </div>
    );
};

export default MinimalDashboard;
