const fs = require('fs');
const path = require('path');

const outputPath = path.join(
  process.cwd(),
  'android',
  'app',
  'src',
  'main',
  'res',
  'values',
  'firebase_auth_client.xml'
);

const webClientId = String(process.env.VITE_FIREBASE_GOOGLE_WEB_CLIENT_ID || '').trim();

const ensureParentDir = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const escapeXml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

if (!webClientId) {
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath);
  }
  console.warn('[mobile] VITE_FIREBASE_GOOGLE_WEB_CLIENT_ID missing; native Google sign-in will be disabled.');
  process.exit(0);
}

const xml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="default_web_client_id" translatable="false">${escapeXml(webClientId)}</string>
</resources>
`;

ensureParentDir(outputPath);
fs.writeFileSync(outputPath, xml, 'utf8');
console.log('[mobile] Wrote Android Google client id resource to', outputPath);
