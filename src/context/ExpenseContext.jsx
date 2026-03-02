/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { normalizePaidBy, normalizeSplitAmong } from '../utils/expenseUtils';

const ExpenseContext = createContext();

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export const ExpenseProvider = ({ children }) => {
    const [people, setPeople] = useState(() => {
        const saved = localStorage.getItem('trip_people');
        return saved ? JSON.parse(saved) : [];
    });

    const [expenses, setExpenses] = useState(() => {
        const saved = localStorage.getItem('trip_expenses');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('trip_people', JSON.stringify(people));
    }, [people]);

    useEffect(() => {
        localStorage.setItem('trip_expenses', JSON.stringify(expenses));
    }, [expenses]);

    const addPerson = (name) => {
        if (!people.find((person) => person.name === name)) {
            setPeople([...people, { id: Date.now().toString(), name }]);
        }
    };

    const removePerson = (id) => {
        setPeople(people.filter((person) => person.id !== id));
        setExpenses(
            expenses.filter((expense) => {
                const payers = normalizePaidBy(expense).map((payer) => payer.id);
                const splitAmong = normalizeSplitAmong(expense);
                return !payers.includes(id) && !splitAmong.includes(id);
            })
        );
    };

    const addExpense = (expense) => {
        const normalized = {
            id: Date.now().toString(),
            description: expense.description || 'General Expense',
            amount: Number(toNumber(expense.amount).toFixed(2)),
            paidBy: normalizePaidBy(expense),
            splitAmong: normalizeSplitAmong(expense),
            date: new Date().toISOString()
        };

        setExpenses([...expenses, normalized]);
    };

    const removeExpense = (id) => {
        setExpenses(expenses.filter((expense) => expense.id !== id));
    };

    const getSummary = () => {
        const balances = {};
        people.forEach((person) => {
            balances[person.id] = 0;
        });

        expenses.forEach((expense) => {
            const amount = toNumber(expense.amount);
            const splitAmong = normalizeSplitAmong(expense);
            const payers = normalizePaidBy(expense);

            if (amount <= 0 || splitAmong.length === 0 || payers.length === 0) {
                return;
            }

            payers.forEach((payer) => {
                if (balances[payer.id] !== undefined) {
                    balances[payer.id] += payer.amount;
                }
            });

            const amountPerPerson = amount / splitAmong.length;
            splitAmong.forEach((personId) => {
                if (balances[personId] !== undefined) {
                    balances[personId] -= amountPerPerson;
                }
            });
        });

        return balances;
    };

    return (
        <ExpenseContext.Provider
            value={{
                people,
                expenses,
                addPerson,
                removePerson,
                addExpense,
                removeExpense,
                getSummary
            }}
        >
            {children}
        </ExpenseContext.Provider>
    );
};

export const useExpenses = () => useContext(ExpenseContext);
