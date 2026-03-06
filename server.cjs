const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DIST_DIR = path.join(__dirname, 'dist');
const DIST_INDEX_PATH = path.join(DIST_DIR, 'index.html');

const app = express();
app.use(cors());

const server = http.createServer(app);

app.get('/health', (_req, res) => {
    res.send('Server is up and running');
});

if (fs.existsSync(DIST_INDEX_PATH)) {
    app.use(express.static(DIST_DIR));

    // Serve SPA routes while keeping health checks and Socket.IO paths intact.
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path === '/health' || req.path.startsWith('/socket.io/')) return next();
        if (path.extname(req.path)) return next();

        res.sendFile(DIST_INDEX_PATH, (err) => {
            if (err) next(err);
        });
    });
} else {
    console.warn('Frontend build not found at dist/index.html. Serving API/socket endpoints only.');
}

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const DATA_DIR = path.join(__dirname, 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');
const DATABASE_URL = process.env.DATABASE_URL || '';
const STORE_ROW_ID = 1;

const createEmptyStore = () => ({
    trips: {},
    userTrips: {}
});

const normalizeStore = (value) => ({
    trips: value?.trips && typeof value.trips === 'object' ? value.trips : {},
    userTrips: value?.userTrips && typeof value.userTrips === 'object' ? value.userTrips : {}
});

const loadStoreFromFile = () => {
    try {
        if (!fs.existsSync(STORE_PATH)) return createEmptyStore();
        const content = fs.readFileSync(STORE_PATH, 'utf8');
        const parsed = JSON.parse(content);
        return normalizeStore(parsed);
    } catch (err) {
        console.error('Failed to load store.json. Starting with empty store.', err);
        return createEmptyStore();
    }
};

const saveStoreToFile = (snapshot) => {
    try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(STORE_PATH, JSON.stringify(snapshot, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to save store.json:', err);
    }
};

const trips = {};
const userTrips = {};
const socketUsers = {};
const userSockets = {};

let dbPool = null;
let isDatabaseStoreEnabled = false;
let storeWriteQueue = Promise.resolve();

const replaceStoreInMemory = (store) => {
    Object.keys(trips).forEach((code) => delete trips[code]);
    Object.assign(trips, store.trips);

    Object.keys(userTrips).forEach((uid) => delete userTrips[uid]);
    Object.assign(userTrips, store.userTrips);
};

const createDatabasePool = async () => {
    if (!DATABASE_URL) return null;

    const connectionOptions = { connectionString: DATABASE_URL };
    const shouldUseSsl = process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production';
    if (shouldUseSsl) {
        connectionOptions.ssl = { rejectUnauthorized: false };
    }

    const pool = new Pool(connectionOptions);
    await pool.query('SELECT 1');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_store (
            id INTEGER PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);
    return pool;
};

const loadStoreFromDatabase = async () => {
    const selectResult = await dbPool.query('SELECT data FROM app_store WHERE id = $1', [STORE_ROW_ID]);
    if (selectResult.rowCount === 0) {
        const emptyStore = createEmptyStore();
        await dbPool.query(
            'INSERT INTO app_store (id, data, updated_at) VALUES ($1, $2::jsonb, NOW())',
            [STORE_ROW_ID, JSON.stringify(emptyStore)]
        );
        return emptyStore;
    }

    const rawData = selectResult.rows[0]?.data;
    const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    return normalizeStore(parsed);
};

const saveStoreToDatabase = async (serializedStore) => {
    await dbPool.query(
        `
            INSERT INTO app_store (id, data, updated_at)
            VALUES ($1, $2::jsonb, NOW())
            ON CONFLICT (id)
            DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
        `,
        [STORE_ROW_ID, serializedStore]
    );
};

const initializePersistence = async () => {
    if (!DATABASE_URL) {
        replaceStoreInMemory(loadStoreFromFile());
        console.log(`Using file store at ${STORE_PATH}.`);
        return;
    }

    try {
        dbPool = await createDatabasePool();
        const store = await loadStoreFromDatabase();
        replaceStoreInMemory(store);
        isDatabaseStoreEnabled = true;
        console.log('Using Postgres store via DATABASE_URL.');
    } catch (err) {
        console.error('Failed to initialize Postgres store. Falling back to file storage.', err);
        if (dbPool) {
            try {
                await dbPool.end();
            } catch {
                // Ignore close errors during fallback.
            }
            dbPool = null;
        }
        replaceStoreInMemory(loadStoreFromFile());
    }
};

const saveStore = () => {
    const snapshot = { trips, userTrips };

    if (isDatabaseStoreEnabled && dbPool) {
        const serializedStore = JSON.stringify(snapshot);
        storeWriteQueue = storeWriteQueue
            .then(() => saveStoreToDatabase(serializedStore))
            .catch((err) => {
                console.error('Failed to save store to Postgres:', err);
            });
        return;
    }

    saveStoreToFile(snapshot);
};

const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const sanitizeName = (value) => {
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
};

const sanitizeCode = (value) => {
    if (typeof value !== 'string') return '';
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
};

const sanitizeTripName = (value, fallbackCode = '') => {
    if (typeof value !== 'string') {
        return fallbackCode ? `Trip ${fallbackCode}` : 'Untitled Trip';
    }
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
        return fallbackCode ? `Trip ${fallbackCode}` : 'Untitled Trip';
    }
    return trimmed.slice(0, 60);
};

const ensureUniqueCode = () => {
    let code = generateCode();
    while (trips[code]) {
        code = generateCode();
    }
    return code;
};

const ensureUserTripRecord = (uid) => {
    if (!uid) return null;
    if (!userTrips[uid] || typeof userTrips[uid] !== 'object') {
        userTrips[uid] = { created: [], joined: [] };
    }
    if (!Array.isArray(userTrips[uid].created)) userTrips[uid].created = [];
    if (!Array.isArray(userTrips[uid].joined)) userTrips[uid].joined = [];
    return userTrips[uid];
};

const attachSocketToUser = (socket, uid) => {
    if (!uid) return;

    const currentUid = socketUsers[socket.id];
    if (currentUid && userSockets[currentUid]) {
        userSockets[currentUid].delete(socket.id);
        if (userSockets[currentUid].size === 0) {
            delete userSockets[currentUid];
        }
    }

    socketUsers[socket.id] = uid;
    if (!userSockets[uid]) userSockets[uid] = new Set();
    userSockets[uid].add(socket.id);
};

const detachSocketFromUser = (socketId) => {
    const uid = socketUsers[socketId];
    if (!uid) return;
    delete socketUsers[socketId];
    if (!userSockets[uid]) return;
    userSockets[uid].delete(socketId);
    if (userSockets[uid].size === 0) {
        delete userSockets[uid];
    }
};

const addUserTrip = (uid, code, role) => {
    const record = ensureUserTripRecord(uid);
    if (!record) return;

    if (role === 'created') {
        if (!record.created.includes(code)) record.created.push(code);
        record.joined = record.joined.filter((joinedCode) => joinedCode !== code);
        return;
    }

    if (!record.created.includes(code) && !record.joined.includes(code)) {
        record.joined.push(code);
    }
};

const summarizeTrip = (code, role) => {
    const trip = trips[code];
    if (!trip) return null;
    const totalSpent = trip.expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
    return {
        code: trip.code,
        tripName: sanitizeTripName(trip.tripName, trip.code),
        role,
        participantsCount: Array.isArray(trip.participants) ? trip.participants.length : 0,
        expensesCount: Array.isArray(trip.expenses) ? trip.expenses.length : 0,
        totalSpent: Number(totalSpent.toFixed(2)),
        updatedAt: trip.updatedAt || trip.createdAt || new Date().toISOString()
    };
};

const buildUserTripSummaries = (uid) => {
    const record = ensureUserTripRecord(uid);
    if (!record) return [];

    const createdCodes = [...new Set(record.created.filter((code) => typeof code === 'string'))];
    const joinedCodes = [...new Set(record.joined.filter((code) => typeof code === 'string'))];
    const joinedOnlyCodes = joinedCodes.filter((code) => !createdCodes.includes(code));

    const summaries = [
        ...createdCodes.map((code) => summarizeTrip(code, 'created')),
        ...joinedOnlyCodes.map((code) => summarizeTrip(code, 'joined'))
    ]
        .filter(Boolean)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return summaries;
};

const emitUserTripsToUid = (uid) => {
    if (!uid || !userSockets[uid]) return;
    const summaries = buildUserTripSummaries(uid);
    userSockets[uid].forEach((socketId) => {
        io.to(socketId).emit('user-trips', summaries);
    });
};

const normalizePayers = (expense) => {
    const amount = toNumber(expense.amount);
    const paidBy = expense.paidBy;

    if (Array.isArray(paidBy) && paidBy.length > 0) {
        if (typeof paidBy[0] === 'string') {
            const share = paidBy.length > 0 ? amount / paidBy.length : 0;
            return paidBy
                .filter(Boolean)
                .map((payerId) => ({ id: payerId, amount: Number(share.toFixed(2)) }));
        }

        return paidBy
            .map((payer) => ({ id: payer?.id, amount: Number(toNumber(payer?.amount).toFixed(2)) }))
            .filter((payer) => payer.id && payer.amount > 0);
    }

    if (typeof paidBy === 'string' && paidBy.trim()) {
        return [{ id: paidBy, amount: Number(amount.toFixed(2)) }];
    }

    return [];
};

const upsertParticipant = (trip, { uid, userName, fallbackId }) => {
    const participantId = uid || fallbackId;
    const existing = trip.participants.find((participant) => participant.id === participantId);

    if (existing) {
        if (userName) existing.name = userName;
        if (uid) existing.uid = uid;
        return participantId;
    }

    trip.participants.push({
        id: participantId,
        uid: uid || null,
        name: userName || 'Trip User',
        joinedAt: new Date().toISOString()
    });

    return participantId;
};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create-trip', ({ userName, userUid, tripName }) => {
        if (!userUid) {
            socket.emit('error', 'Authentication required. Please log in again.');
            return;
        }

        attachSocketToUser(socket, userUid);
        const normalizedName = sanitizeName(userName) || 'Trip User';
        const code = ensureUniqueCode();
        const participant = { id: userUid, uid: userUid, name: normalizedName, joinedAt: new Date().toISOString() };
        const now = new Date().toISOString();

        trips[code] = {
            code,
            tripName: sanitizeTripName(tripName, code),
            ownerUid: userUid,
            participants: [participant],
            expenses: [],
            createdAt: now,
            updatedAt: now
        };

        addUserTrip(userUid, code, 'created');
        saveStore();

        socket.join(code);
        socket.emit('trip-joined', { code, trip: trips[code], myId: participant.id });
        emitUserTripsToUid(userUid);
    });

    socket.on('join-trip', ({ userName, code, userUid }) => {
        if (!userUid) {
            socket.emit('error', 'Authentication required. Please log in again.');
            return;
        }

        attachSocketToUser(socket, userUid);
        const normalizedCode = sanitizeCode(code);
        const trip = trips[normalizedCode];
        if (!trip) {
            socket.emit('error', 'Trip not found');
            return;
        }
        if (!trip.tripName) {
            trip.tripName = sanitizeTripName('', normalizedCode);
        }

        const normalizedName = sanitizeName(userName) || 'Trip User';
        const participantId = upsertParticipant(trip, { uid: userUid, userName: normalizedName, fallbackId: socket.id });
        trip.updatedAt = new Date().toISOString();

        addUserTrip(userUid, normalizedCode, trip.ownerUid === userUid ? 'created' : 'joined');
        saveStore();

        socket.join(normalizedCode);
        socket.emit('trip-joined', { code: normalizedCode, trip, myId: participantId });
        io.to(normalizedCode).emit('update-trip', trip);
        emitUserTripsToUid(userUid);
    });

    socket.on('rejoin-trip', ({ userName, code, userUid }) => {
        if (!userUid) {
            socket.emit('error', 'Authentication required. Please log in again.');
            return;
        }

        attachSocketToUser(socket, userUid);
        const normalizedCode = sanitizeCode(code);
        const trip = trips[normalizedCode];
        if (!trip) {
            socket.emit('error', 'Trip not found');
            return;
        }
        if (!trip.tripName) {
            trip.tripName = sanitizeTripName('', normalizedCode);
        }

        const normalizedName = sanitizeName(userName) || 'Trip User';
        const participantId = upsertParticipant(trip, { uid: userUid, userName: normalizedName, fallbackId: socket.id });
        trip.updatedAt = new Date().toISOString();
        addUserTrip(userUid, normalizedCode, trip.ownerUid === userUid ? 'created' : 'joined');
        saveStore();

        socket.join(normalizedCode);
        socket.emit('trip-joined', { code: normalizedCode, trip, myId: participantId });
        io.to(normalizedCode).emit('update-trip', trip);
        emitUserTripsToUid(userUid);
    });

    socket.on('get-user-trips', ({ userUid }) => {
        if (!userUid) {
            socket.emit('user-trips', []);
            return;
        }

        attachSocketToUser(socket, userUid);
        socket.emit('user-trips', buildUserTripSummaries(userUid));
    });

    socket.on('add-expense', ({ code, expense }) => {
        const normalizedCode = sanitizeCode(code);
        const trip = trips[normalizedCode];
        if (!trip) {
            socket.emit('error', 'Trip not found');
            return;
        }

        const participantIds = new Set(trip.participants.map((participant) => participant.id));
        const splitAmong = Array.isArray(expense.splitAmong)
            ? [...new Set(expense.splitAmong.filter((id) => participantIds.has(id)))]
            : [];
        const paidBy = normalizePayers(expense).filter((payer) => participantIds.has(payer.id));
        const amount = Number(toNumber(expense.amount).toFixed(2));
        const description = typeof expense.description === 'string' && expense.description.trim()
            ? expense.description.trim()
            : 'General Expense';

        if (amount <= 0 || splitAmong.length === 0 || paidBy.length === 0) {
            socket.emit('error', 'Invalid expense data.');
            return;
        }

        const payerTotal = paidBy.reduce((sum, payer) => sum + payer.amount, 0);
        if (Math.abs(payerTotal - amount) > 0.01) {
            socket.emit('error', 'Payer contributions must match total amount.');
            return;
        }

        const newExpense = {
            id: Date.now().toString(),
            description,
            amount,
            splitAmong,
            paidBy,
            date: new Date().toISOString()
        };

        trip.expenses.push(newExpense);
        trip.updatedAt = new Date().toISOString();
        saveStore();
        io.to(normalizedCode).emit('update-trip', trip);

        const involved = [...new Set([...splitAmong, ...paidBy.map((payer) => payer.id)])];
        const payerNames = paidBy
            .map((payer) => trip.participants.find((participant) => participant.id === payer.id)?.name || 'Unknown')
            .join(', ');

        io.to(normalizedCode).emit('notification', {
            message: `${newExpense.description} added: Rs ${newExpense.amount.toFixed(2)} by ${payerNames}`,
            involved
        });

        [...new Set(trip.participants.map((participant) => participant.uid).filter(Boolean))]
            .forEach((uid) => emitUserTripsToUid(uid));
    });

    socket.on('disconnect', () => {
        detachSocketFromUser(socket.id);
        console.log('User disconnected:', socket.id);
    });
});

const PORT = Number(process.env.PORT) || 3001;

const closePersistence = async () => {
    if (isDatabaseStoreEnabled) {
        try {
            await storeWriteQueue;
        } catch {
            // Ignore pending write queue errors during shutdown.
        }
    }

    if (dbPool) {
        try {
            await dbPool.end();
        } catch (err) {
            console.error('Failed to close Postgres pool cleanly:', err);
        }
    }
};

const startServer = async () => {
    await initializePersistence();
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on all interfaces at port ${PORT}`);
    });
};

const handleShutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    closePersistence()
        .finally(() => process.exit(0));
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer().catch((err) => {
    console.error('Server startup failed:', err);
    process.exit(1);
});
