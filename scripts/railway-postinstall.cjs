const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cleanupLegacyViteCache = () => {
    const legacyViteCacheDir = path.join(process.cwd(), 'node_modules', '.vite');
    try {
        fs.rmSync(legacyViteCacheDir, { recursive: true, force: true });
    } catch (err) {
        console.warn(`[postinstall] Failed to remove legacy Vite cache at ${legacyViteCacheDir}:`, err.message);
    }
};

const isRailway = Object.keys(process.env).some((key) => key.startsWith('RAILWAY_'));
if (!isRailway) {
    console.log('[postinstall] Railway environment not detected. Skipping frontend build.');
    process.exit(0);
}

const serviceName = (process.env.RAILWAY_SERVICE_NAME || '').toLowerCase();
const isLikelyApiService = serviceName.includes('api');
if (isLikelyApiService) {
    cleanupLegacyViteCache();
    console.log(`[postinstall] Service "${serviceName}" looks like API. Skipping frontend build.`);
    process.exit(0);
}

console.log('[postinstall] Railway environment detected. Building frontend assets...');
try {
    execSync('npm run build', { stdio: 'inherit', shell: true });
} catch (err) {
    process.exit(err.status ?? 1);
}

// Railpack can run a second npm ci; ensure Vite cache inside node_modules won't break cleanup.
cleanupLegacyViteCache();
