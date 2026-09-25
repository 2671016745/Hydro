const { MongoClient } = require('mongodb');
const fs = require('fs');
const os = require('os');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.hydro', 'config.json'), 'utf8'));
(async () => {
  const c = await MongoClient.connect(cfg.url);
  const db = c.db(new URL(cfg.url).pathname.replace(/^\//, '') || 'hydro');
  await db.collection('domain').updateOne(
    { _id: 'system' },
    { $set: { avatar: 'url:/img/guiguang-school-badge.png' } },
  );
  console.log(JSON.stringify(await db.collection('domain').findOne({ _id: 'system' }, { projection: { name: 1, avatar: 1 } }), null, 2));
  await c.close();
})().catch((e) => { console.error(e); process.exit(1); });
