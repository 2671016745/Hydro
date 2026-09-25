/**
 * Cap log file size (default 100MB).
 * Usage: node data/cap-log.js <file> [maxMB]
 * - if file missing or under limit: no-op
 * - if over limit: keep last 50MB as <file>, move old to <file>.1
 */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
const maxMB = Number(process.argv[3] || 100);
if (!file) {
    console.error('usage: node data/cap-log.js <file> [maxMB]');
    process.exit(1);
}
const maxBytes = Math.max(1, maxMB) * 1024 * 1024;
try {
    const st = fs.statSync(file);
    if (st.size <= maxBytes) {
        process.exit(0);
    }
    const keep = Math.floor(maxBytes / 2); // keep ~50MB tail when over 100MB
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(keep);
    fs.readSync(fd, buf, 0, keep, st.size - keep);
    fs.closeSync(fd);
    try {
        fs.renameSync(file, `${file}.1`);
    } catch { /* ignore */ }
    fs.writeFileSync(file, buf);
    console.log(`capped ${file} ${st.size} -> ${keep} (rotate to .1)`);
} catch (e) {
    if (e.code !== 'ENOENT') {
        console.error('cap-log failed', e.message);
        process.exit(1);
    }
}
