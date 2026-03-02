import React, { useState } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { UserPlus, UserMinus, Users } from 'lucide-react';
import { getPersonTheme } from '../utils/personColors';

const PersonList = () => {
    const { people, addPerson, removePerson } = useExpenses();
    const [newName, setNewName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newName.trim()) {
            addPerson(newName.trim());
            setNewName('');
        }
    };

    return (
        <div className="glass-panel animate-slide-up" style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={24} color="var(--accent-secondary)" />
                Travelers
            </h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                    type="text"
                    placeholder="Enter name..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>
                    <UserPlus size={20} />
                </button>
            </form>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {people.map((person, idx) => {
                    const theme = getPersonTheme(idx);

                    return (
                        <div
                            key={person.id}
                            className="person-bar-refined"
                            style={{
                                padding: '8px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                borderRadius: '12px',
                                background: theme.bg,
                                border: `1px solid ${theme.accent}`,
                                color: theme.text,
                                fontWeight: '600',
                            }}
                        >
                            <span>{person.name}</span>
                            <button
                                onClick={() => removePerson(person.id)}
                                style={{
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '4px',
                                    borderRadius: '6px'
                                }}
                            >
                                <UserMinus size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PersonList;
