const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value) => Number(value.toFixed(2));

const money = (value) => `Rs ${safeNumber(value).toFixed(2)}`;

export const normalizePaidBy = (expense) => {
  const amount = safeNumber(expense?.amount);
  const paidBy = expense?.paidBy;

  if (Array.isArray(paidBy) && paidBy.length > 0) {
    if (typeof paidBy[0] === 'string') {
      const share = paidBy.length > 0 ? amount / paidBy.length : 0;
      return paidBy
        .filter(Boolean)
        .map((id) => ({ id, amount: round(share) }));
    }

    return paidBy
      .map((payer) => ({ id: payer?.id, amount: safeNumber(payer?.amount) }))
      .filter((payer) => payer.id && payer.amount > 0);
  }

  if (typeof paidBy === 'string' && paidBy.trim()) {
    return [{ id: paidBy, amount: round(amount) }];
  }

  return [];
};

export const normalizeSplitAmong = (expense) => {
  if (!Array.isArray(expense?.splitAmong)) {
    return [];
  }

  return [...new Set(expense.splitAmong.filter(Boolean))];
};

export const calculateTripBalances = (trip) => {
  const balances = {};
  (trip?.participants || []).forEach((participant) => {
    balances[participant.id] = 0;
  });

  (trip?.expenses || []).forEach((expense) => {
    const amount = safeNumber(expense?.amount);
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

    const share = amount / splitAmong.length;
    splitAmong.forEach((personId) => {
      if (balances[personId] !== undefined) {
        balances[personId] -= share;
      }
    });
  });

  return balances;
};

export const getExpensePerHead = (expense) => {
  const splitAmong = normalizeSplitAmong(expense);
  const amount = safeNumber(expense?.amount);
  if (splitAmong.length === 0) {
    return 0;
  }
  return amount / splitAmong.length;
};

export const formatTimestamp = (isoDate) => {
  const date = isoDate ? new Date(isoDate) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const buildTripReport = ({ trip, balances, settlements }) => {
  const participantsById = Object.fromEntries(
    (trip?.participants || []).map((participant) => [participant.id, participant.name])
  );

  const sortedExpenses = [...(trip?.expenses || [])]
    .sort((a, b) => new Date(a?.date || 0).getTime() - new Date(b?.date || 0).getTime());

  const totalSpent = sortedExpenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0);

  const lines = [
    '# Trip Spending Document',
    '',
    `Trip name: ${trip?.tripName || 'Untitled Trip'}`,
    `Trip code: ${trip?.code || 'N/A'}`,
    `Generated at: ${formatTimestamp(new Date().toISOString())}`,
    '',
    '## Participants',
    ...(trip?.participants || []).map((participant) => `- ${participant.name}`),
    '',
    '## Totals',
    `- Total spent: Rs ${totalSpent.toFixed(2)}`,
    '',
    '## Balances',
    ...Object.entries(balances || {}).map(([personId, balance]) => {
      const name = participantsById[personId] || 'Unknown';
      const sign = balance >= 0 ? '+' : '';
      return `- ${name}: ${sign}Rs ${balance.toFixed(2)}`;
    }),
    '',
    '## Settlement Suggestions',
    ...(settlements?.length
      ? settlements.map((settlement) =>
          `- ${settlement.from} -> ${settlement.to}: Rs ${settlement.amount.toFixed(2)}`
        )
      : ['- No settlements needed']),
    '',
    '## Expense Log'
  ];

  if (!sortedExpenses.length) {
    lines.push('- No spending records yet.');
    return lines.join('\n');
  }

  sortedExpenses.forEach((expense, index) => {
    const payers = normalizePaidBy(expense);
    const splitAmong = normalizeSplitAmong(expense);
    const perHead = getExpensePerHead(expense);
    const payerLine = payers
      .map((payer) => `${participantsById[payer.id] || 'Unknown'} (Rs ${payer.amount.toFixed(2)})`)
      .join(', ');
    const splitLine = splitAmong
      .map((personId) => participantsById[personId] || 'Unknown')
      .join(', ');

    lines.push(
      '',
      `### ${index + 1}. ${expense.description || 'General Expense'}`,
      `- Time: ${formatTimestamp(expense.date)}`,
      `- Total: Rs ${safeNumber(expense.amount).toFixed(2)}`,
      `- Paid by: ${payerLine || 'N/A'}`,
      `- Split among: ${splitLine || 'N/A'}`,
      `- Per head: Rs ${perHead.toFixed(2)}`
    );
  });

  return lines.join('\n');
};

export const calculateParticipantSummary = (trip) => {
  const participants = trip?.participants || [];
  const paidTotals = Object.fromEntries(participants.map((participant) => [participant.id, 0]));
  const shareTotals = Object.fromEntries(participants.map((participant) => [participant.id, 0]));

  (trip?.expenses || []).forEach((expense) => {
    const amount = safeNumber(expense?.amount);
    const splitAmong = normalizeSplitAmong(expense);
    const payers = normalizePaidBy(expense);

    if (amount <= 0 || splitAmong.length === 0 || payers.length === 0) {
      return;
    }

    payers.forEach((payer) => {
      if (paidTotals[payer.id] !== undefined) {
        paidTotals[payer.id] += safeNumber(payer.amount);
      }
    });

    const perHead = amount / splitAmong.length;
    splitAmong.forEach((personId) => {
      if (shareTotals[personId] !== undefined) {
        shareTotals[personId] += perHead;
      }
    });
  });

  return participants.map((participant) => {
    const paid = round(paidTotals[participant.id] || 0);
    const share = round(shareTotals[participant.id] || 0);
    return {
      id: participant.id,
      name: participant.name,
      paid,
      share,
      net: round(paid - share)
    };
  });
};

export const buildTripReadableDocument = ({ trip, balances, settlements }) => {
  const participantsById = Object.fromEntries(
    (trip?.participants || []).map((participant) => [participant.id, participant.name])
  );

  const sortedExpenses = [...(trip?.expenses || [])]
    .sort((a, b) => new Date(a?.date || 0).getTime() - new Date(b?.date || 0).getTime());
  const totalSpent = sortedExpenses.reduce((sum, expense) => sum + safeNumber(expense.amount), 0);
  const participantSummary = calculateParticipantSummary(trip);

  const lines = [
    'TRIP SPENDING DOCUMENT',
    '======================',
    '',
    `Trip name: ${trip?.tripName || 'Untitled Trip'}`,
    `Trip code: ${trip?.code || 'N/A'}`,
    `Generated at: ${formatTimestamp(new Date().toISOString())}`,
    '',
    '1) Overview',
    `- People: ${(trip?.participants || []).length}`,
    `- Expense entries: ${sortedExpenses.length}`,
    `- Total spent: ${money(totalSpent)}`,
    '',
    '2) Person-wise Summary',
    '- Format: Name | Paid | Share | Net'
  ];

  participantSummary.forEach((row) => {
    const sign = row.net >= 0 ? '+' : '';
    lines.push(`- ${row.name} | ${money(row.paid)} | ${money(row.share)} | ${sign}${money(row.net)}`);
  });

  lines.push('', '3) Balance Status');
  Object.entries(balances || {}).forEach(([personId, balance]) => {
    const name = participantsById[personId] || 'Unknown';
    const sign = balance >= 0 ? '+' : '';
    lines.push(`- ${name}: ${sign}${money(balance)}`);
  });

  lines.push('', '4) Suggested Settlements');
  if (settlements?.length) {
    settlements.forEach((settlement) => {
      lines.push(`- ${settlement.from} pays ${settlement.to}: ${money(settlement.amount)}`);
    });
  } else {
    lines.push('- Everyone is already settled.');
  }

  lines.push('', '5) Expense Timeline');
  if (!sortedExpenses.length) {
    lines.push('- No spending records yet.');
    return lines.join('\n');
  }

  sortedExpenses.forEach((expense, index) => {
    const payers = normalizePaidBy(expense)
      .map((payer) => `${participantsById[payer.id] || 'Unknown'} (${money(payer.amount)})`)
      .join(', ');
    const splitAmong = normalizeSplitAmong(expense)
      .map((personId) => participantsById[personId] || 'Unknown')
      .join(', ');
    lines.push(
      '',
      `${index + 1}. ${expense.description || 'General Expense'}`,
      `   Time: ${formatTimestamp(expense.date)}`,
      `   Amount: ${money(expense.amount)}`,
      `   Paid by: ${payers || 'N/A'}`,
      `   Split among: ${splitAmong || 'N/A'}`,
      `   Per head: ${money(getExpensePerHead(expense))}`
    );
  });

  return lines.join('\n');
};

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const buildTripExpensesCsv = (trip) => {
  const participantsById = Object.fromEntries(
    (trip?.participants || []).map((participant) => [participant.id, participant.name])
  );

  const header = [
    'Trip Code',
    'Date',
    'Description',
    'Total Amount',
    'Paid By',
    'Split Among',
    'Per Head'
  ];

  const rows = [...(trip?.expenses || [])]
    .sort((a, b) => new Date(a?.date || 0).getTime() - new Date(b?.date || 0).getTime())
    .map((expense) => {
      const payers = normalizePaidBy(expense)
        .map((payer) => `${participantsById[payer.id] || 'Unknown'} (${money(payer.amount)})`)
        .join('; ');
      const split = normalizeSplitAmong(expense)
        .map((personId) => participantsById[personId] || 'Unknown')
        .join('; ');

      return [
        trip?.code || 'N/A',
        formatTimestamp(expense.date),
        expense.description || 'General Expense',
        safeNumber(expense.amount).toFixed(2),
        payers,
        split,
        getExpensePerHead(expense).toFixed(2)
      ];
    });

  return [header, ...rows]
    .map((line) => line.map((cell) => escapeCsv(cell)).join(','))
    .join('\n');
};
