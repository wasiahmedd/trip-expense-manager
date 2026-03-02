import React from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { Trash2, History } from 'lucide-react';
import { normalizePaidBy } from '../utils/expenseUtils';

const ExpenseList = () => {
    const { expenses, people, removeExpense } = useExpenses();

    const getPersonName = (id) => {
        const person = people.find((entry) => entry.id === id);
        return person ? person.name : 'Unknown';
    };

    if (expenses.length === 0) {
        return (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No expenses recorded yet.
            </div>
        );
    }

    return (
        <div className="glass-panel animate-slide-up" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <History size={24} color="var(--text-secondary)" />
                Expense History
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[...expenses].reverse().map((expense) => {
                    const payerText = normalizePaidBy(expense)
                        .map((payer) => `${getPersonName(payer.id)} (Rs ${payer.amount.toFixed(2)})`)
                        .join(', ');

                    return (
                        <div
                            key={expense.id}
                            className="glass-panel"
                            style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <div>
                                <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{expense.description}</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Paid by <span style={{ color: 'var(--text-primary)' }}>{payerText || 'Unknown'}</span>
                                    {' '}• Split among {expense.splitAmong.length} people
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ fontWeight: '700', color: 'var(--text-primary)', fontSize: '18px' }}>
                                    Rs {expense.amount.toFixed(2)}
                                </span>
                                <button
                                    onClick={() => removeExpense(expense.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: 0.7 }}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ExpenseList;

