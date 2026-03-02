import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { PlusCircle, DollarSign, Tag, CheckSquare, Square } from 'lucide-react';

const ExpenseForm = () => {
    const { people, addExpense } = useExpenses();
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [splitAmong, setSplitAmong] = useState([]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!description || !amount || !paidBy || splitAmong.length === 0) return;

        addExpense({
            description,
            amount: parseFloat(amount),
            paidBy,
            splitAmong
        });

        // Reset
        setDescription('');
        setAmount('');
        // Keep paidBy as the last person who paid might be paying again
    };

    const toggleSplit = (personId) => {
        if (splitAmong.includes(personId)) {
            setSplitAmong(splitAmong.filter(id => id !== personId));
        } else {
            setSplitAmong([...splitAmong, personId]);
        }
    };

    const selectAll = () => {
        setSplitAmong(people.map(p => p.id));
    };

    if (people.length < 2) {
        return (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Add at least 2 travelers to start adding expenses.
            </div>
        );
    }

    return (
        <div className="glass-panel animate-slide-up" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PlusCircle size={24} color="var(--accent-primary)" />
                Add Expense
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Description</label>
                    <div style={{ position: 'relative' }}>
                        <Tag size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="e.g. Dinner, Fuel, Hotel"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ width: '100%', paddingLeft: '40px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Amount</label>
                    <div style={{ position: 'relative' }}>
                        <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-secondary)' }} />
                        <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            style={{ width: '100%', paddingLeft: '40px' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Who paid?</label>
                    <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} style={{ width: '100%' }}>
                        <option value="">Select traveler</option>
                        {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Split among</label>
                        <button type="button" onClick={selectAll} style={{ fontSize: '12px', background: 'none', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer' }}>Select All</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                        {people.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => toggleSplit(p.id)}
                                className={`btn ${splitAmong.includes(p.id) ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '8px', fontSize: '14px', justifyContent: 'center' }}
                            >
                                {splitAmong.includes(p.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}>
                    Save Expense
                </button>
            </form>
        </div>
    );
};

export default ExpenseForm;
