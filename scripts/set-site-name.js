const { MongoClient } = require('mongodb');
const fs = require('fs');
const os = require('os');
const path = require('path');
const name = process.argv[2] || '奎光';
const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.hydro', 'config.json'), 'utf8'));
(async () => {
  const client = await MongoClient.connect(cfg.url);
  const db = client.db(new URL(cfg.url).pathname.replace(/^\//, '') || 'hydro');
  await db.collection('system').updateOne({ _id: 'server.name' }, { $set: { value: name } }, { upsert: true });
  const d = await db.collection('domain').updateOne({ _id: 'system' }, { $set: { name, 'ui.name': name } });
  console.log(JSON.stringify({
    serverName: (await db.collection('system').findOne({ _id: 'server.name' })),
    domain: await db.collection('domain').findOne({ _id: 'system' }, { projection: { name: 1, ui: 1 } }),
  }, null, 2));
  await client.close();
})().catch((e) => { console.error(e); process.exit(1); });
