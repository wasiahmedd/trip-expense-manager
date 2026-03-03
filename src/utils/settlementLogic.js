/**
 * Minimizes transactions between participants.
 * @param {Object} balances - Map of personId to their net balance (positive means they are owed, negative means they owe)
 * @param {Array} people - List of people objects {id, name}
 * @returns {Array} - List of transactions {from, to, amount}
 */
export const calculateSettlements = (balances, people) => {
    const debtors = [];
    const creditors = [];

    const personMap = {};
    people.forEach(p => personMap[p.id] = p.name);

    Object.entries(balances).forEach(([id, balance]) => {
        if (balance < -0.01) {
            debtors.push({ id, amount: Math.abs(balance) });
        } else if (balance > 0.01) {
            creditors.push({ id, amount: balance });
        }
    });

    // Sort to optimize (optional, but greedy works well)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
        const amount = Math.min(debtors[i].amount, creditors[j].amount);

        transactions.push({
            fromId: debtors[i].id,
            from: personMap[debtors[i].id],
            toId: creditors[j].id,
            to: personMap[creditors[j].id],
            amount: Number(amount.toFixed(2))
        });

        debtors[i].amount -= amount;
        creditors[j].amount -= amount;

        if (debtors[i].amount < 0.01) i++;
        if (creditors[j].amount < 0.01) j++;
    }

    return transactions;
};
