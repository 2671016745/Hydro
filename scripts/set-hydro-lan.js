const { MongoClient } = require('mongodb');
const fs = require('fs');
const os = require('os');
const path = require('path');
const nets = require('os').networkInterfaces();

(async () => {
    const configPath = path.join(os.homedir(), '.hydro', 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const uri = config.url;
    const lanIps = [];
    for (const [name, list] of Object.entries(nets)) {
        for (const net of list || []) {
            if (net.family === 'IPv4' && !net.internal && !/VMware|vEthernet|Loopback|WSL/i.test(name)) {
                lanIps.push({ name, address: net.address });
            }
        }
    }
    const primary = lanIps.find(i => /以太网|Ethernet|Wi-?Fi/i.test(i.name)) || lanIps[0];
    const lanIp = primary?.address || '127.0.0.1';
    const lanUrl = `http://${lanIp}:8888/`;

    config.server = { ...config.server, host: '0.0.0.0', port: 8888, url: lanUrl };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const client = await MongoClient.connect(uri);
    const dbName = new URL(uri).pathname.replace(/^\//, '') || 'hydro';
    const db = client.db(dbName);
    const settings = [
        ['server.host', '0.0.0.0'],
        ['server.port', 8888],
        ['server.url', lanUrl],
    ];
    for (const [key, value] of settings) {
        await db.collection('system').updateOne(
            { _id: key },
            { $set: { value } },
            { upsert: true },
        );
    }
    const rows = await db.collection('system').find({ _id: { $in: settings.map(s => s[0]) } }).toArray();
    console.log(JSON.stringify({ lanIps, lanUrl, mongoUri: uri, settings: rows }, null, 2));
    await client.close();
})();
