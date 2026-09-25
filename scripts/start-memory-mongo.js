const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    console.log('MONGO_URI=' + uri);
    const hydroDir = path.join(os.homedir(), '.hydro');
    fs.mkdirSync(hydroDir, { recursive: true });
    fs.writeFileSync(path.join(hydroDir, 'config.json'), JSON.stringify({
        url: uri,
        server: {
            url: 'http://127.0.0.1:8888/',
            host: '127.0.0.1',
            port: 8888,
        },
        session: {
            domain: null,
        },
    }, null, 2));
    const addonPath = path.join(hydroDir, 'addon.json');
    let addons = [];
    try { addons = JSON.parse(fs.readFileSync(addonPath, 'utf8')); } catch { addons = []; }
    if (!Array.isArray(addons) || !addons.includes('@hydrooj/ui-default')) {
        addons = ['@hydrooj/ui-default'];
    }
    fs.writeFileSync(addonPath, JSON.stringify(addons));
    // Keep process alive so mongod persists for Hydro
    process.on('SIGTERM', async () => { await mongod.stop(); process.exit(0); });
    process.on('SIGINT', async () => { await mongod.stop(); process.exit(0); });
    setInterval(() => {}, 1 << 30);
})();
