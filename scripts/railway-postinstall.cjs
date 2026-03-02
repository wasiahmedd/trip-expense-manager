const { execSync } = require('child_process');

const isRailway = Object.keys(process.env).some((key) => key.startsWith('RAILWAY_'));

if (!isRailway) {
    console.log('[postinstall] Railway environment not detected. Skipping frontend build.');
    process.exit(0);
}

console.log('[postinstall] Railway environment detected. Building frontend assets...');
try {
    execSync('npm run build', { stdio: 'inherit', shell: true });
} catch (err) {
    process.exit(err.status ?? 1);
}
