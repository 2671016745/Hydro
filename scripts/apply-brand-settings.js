/**
 * Apply school branding once at process start (called from start scripts).
 * Not part of Hydro boot — keeps worker startup light.
 * Works with SQLite config url, or prints a hint for Mongo setups.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const NAV_LOGO = '/components/navigation/nav-logo-small_dark.png';
const BADGE = 'url:/img/guiguang-school-badge.png';
const NAME = '奎光';

function upsertSystem(collName, id, doc) {
    // collName unused for sqlite layout; kept for clarity
    return { id, doc };
}

async function main() {
    const cfgPath = path.join(os.homedir(), '.hydro', 'config.json');
    let cfg = {};
    try {
        cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    } catch (e) {
        console.error('cannot read', cfgPath, e.message);
        process.exit(1);
    }
    const url = cfg.url || '';

    if (url.startsWith('sqlite:')) {
        let p = url.slice('sqlite:'.length);
        if (p.startsWith('//')) p = p.slice(2);
        const { DatabaseSync } = require('node:sqlite');
        const db = new DatabaseSync(p);
        db.exec(`CREATE TABLE IF NOT EXISTS docs (
            collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL,
            PRIMARY KEY (collection, id))`);
        const upsert = (collection, id, doc) => {
            db.prepare('INSERT INTO docs (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data')
                .run(collection, id, JSON.stringify(doc));
        };
        const get = (collection, id) => {
            const row = db.prepare('SELECT data FROM docs WHERE collection = ? AND id = ?').get(collection, id);
            return row ? JSON.parse(row.data) : null;
        };
        upsert('system', 'ui-default.nav_logo_dark', { _id: 'ui-default.nav_logo_dark', value: NAV_LOGO });
        upsert('system', 'server.name', { _id: 'server.name', value: NAME });
        const domain = get('domain', 'system') || { _id: 'system', lower: 'system', name: NAME };
        if (!domain.name || domain.name === 'New domain') domain.name = NAME;
        if (!domain.avatar) domain.avatar = BADGE;
        domain.ui = { ...(domain.ui || {}), name: NAME };
        upsert('domain', 'system', domain);
        console.log('branding applied (sqlite)', NAV_LOGO, BADGE, NAME);
        db.close();
        return;
    }

    // Mongo: only patch config.json-facing expectations via scripts/set-domain-avatar.js etc.
    console.log('branding: non-sqlite url detected; run data/set-site-name.js and data/set-domain-avatar.js');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
