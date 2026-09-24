/**
 * Smoke test for the SQLite collection layer (run from Hydro repo root):
 *   node -r @hydrooj/register packages/hydrooj/src/service/sqlite.smoke.ts
 * or after tsc:
 *   node packages/hydrooj/lib/service/sqlite.smoke.js
 */
import { SqliteDatabase } from './sqlite';
import { ObjectId } from 'bson';

async function main() {
    const db = new SqliteDatabase(':memory:');
    const coll = db.collection('user');
    await coll.insertOne({ _id: 1, uname: 'alice', tags: ['a', 'b'], score: 10, createdAt: new Date('2026-01-01') });
    await coll.insertOne({ _id: 2, uname: 'bob', tags: ['b'], score: 20, createdAt: new Date('2026-02-01') });
    await coll.insertMany([{ _id: 3, uname: 'carol', score: 5 }]);

    const all = await coll.find({}).sort({ score: -1 }).toArray();
    console.assert(all.length === 3, 'find all', all.length);
    console.assert(all[0].uname === 'bob', 'sort desc', all[0]);

    const inTags = await coll.find({ tags: 'a' }).toArray();
    console.assert(inTags.length === 1 && inTags[0].uname === 'alice', 'array eq');

    const range = await coll.countDocuments({ score: { $gte: 10 } });
    console.assert(range === 2, 'count gte', range);

    await coll.updateOne({ uname: 'alice' }, { $set: { score: 30 }, $push: { tags: 'c' } });
    const alice = await coll.findOne({ uname: 'alice' });
    console.assert(alice.score === 30 && alice.tags.includes('c'), 'update', alice);

    const up = await coll.findOneAndUpdate({ uname: 'bob' }, { $inc: { score: 1 } }, { returnDocument: 'after' });
    console.assert(up.value.score === 21, 'findOneAndUpdate', up.value);

    const del = await coll.deleteMany({ score: { $lt: 10 } });
    console.assert(del.deletedCount === 1, 'deleteMany', del);

    const grouped = await coll.aggregate([
        { $match: { score: { $gt: 1 } } },
        { $group: { _id: null, total: { $sum: '$score' } } },
    ]).toArray();
    console.assert(grouped[0].total === 51, 'aggregate sum', grouped);

    const oid = new ObjectId();
    await coll.insertOne({ _id: oid, uname: 'oid-user', createdAt: new Date() });
    const got = await coll.findOne({ _id: oid });
    console.assert(got && got.uname === 'oid-user', 'ObjectId roundtrip');
    console.assert(got.createdAt instanceof Date, 'Date roundtrip', got.createdAt);

    console.log('sqlite smoke OK');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
