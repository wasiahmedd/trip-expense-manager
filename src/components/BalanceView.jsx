import React from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { calculateSettlements } from '../utils/settlementLogic';
import { PieChart, ArrowRight, Wallet } from 'lucide-react';
import { getPersonTheme } from '../utils/personColors';

const BalanceView = () => {
    const { people, expenses, getSummary } = useExpenses();
    const balances = getSummary();
    const settlements = calculateSettlements(balances, people);

    if (people.length < 2 || expenses.length === 0) {
        return null;
    }

    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    return (
        <div className="glass-panel animate-slide-up" style={{ padding: '24px', marginBottom: '80px' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PieChart size={24} color="var(--success)" />
                Trip Summary
            </h2>

            <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Group Spend</p>
                <h1 style={{ color: 'var(--text-primary)', fontSize: '32px' }}>Rs {totalSpent.toFixed(2)}</h1>
            </div>

            <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Member Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                {Object.entries(balances).map(([id, balance], index) => {
                    const person = people.find((entry) => entry.id === id);
                    if (!person) return null;
                    const theme = getPersonTheme(index);

                    return (
                        <div
                            key={id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                background: theme.bg,
                                border: `1px solid ${theme.accent}`,
                                color: theme.text,
                                fontWeight: '600'
                            }}
                        >
                            <span>{person.name}</span>
                            <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 10px', borderRadius: '20px', fontSize: '14px' }}>
                                {balance >= 0 ? '+' : ''}Rs {balance.toFixed(2)}
                            </span>
                        </div>
                    );
                })}
            </div>

            {settlements.length > 0 && (
                <>
                    <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>To Settle Up</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {settlements.map((settlement, index) => (
                            <div
                                key={index}
                                className="glass-panel"
                                style={{
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: '500' }}>{settlement.from}</span>
                                    <ArrowRight size={16} color="var(--text-secondary)" />
                                    <span style={{ fontWeight: '500' }}>{settlement.to}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Wallet size={16} color="var(--text-secondary)" />
                                    <span style={{ fontWeight: '700', fontSize: '16px' }}>Rs {settlement.amount.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default BalanceView;

