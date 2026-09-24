/* eslint-disable no-await-in-loop */
import {
    Collection, Db, FindCursor, IndexDescription, MongoClient,
} from 'mongodb';
import mongoUri from 'mongodb-uri';
import path from 'path';
import { Time } from '@hydrooj/utils';
import { Context, Service } from '../context';
import { ValidationError } from '../error';
import { Logger } from '../logger';
import { load } from '../options';
import bus from './bus';
import { SqliteDatabase, SqliteCollection, SqliteCursor, parseSqliteUrl } from './sqlite';

const logger = new Logger('mongo');
export interface Collections { }

interface MongoConfig {
    protocol?: string;
    username?: string;
    password?: string;
    host?: string;
    port?: string;
    name?: string;
    url?: string;
    uri?: string;
    prefix?: string;
    collectionMap?: Record<string, string>;
}

declare module 'cordis' {
    interface Context {
        db: MongoService;
    }
}

export class MongoService extends Service {
    public client: MongoClient | null = null;
    public db: Db | null = null;
    public sqlite: SqliteDatabase | null = null;

    constructor(ctx: Context, private config: MongoConfig = {}) {
        super(ctx, 'db');
    }

    static isSqliteUrl(url: string) {
        return !!url && (url.startsWith('sqlite:') || url.startsWith('sqlite://'));
    }

    static async getUrl() {
        if (process.env.CI) {
            const { MongoMemoryServer } = require('mongodb-memory-server');
            const mongod = await MongoMemoryServer.create();
            return mongod.getUri();
        }
        const opts = load();
        if (!opts) return null;
        // explicit sqlite shortcut
        if (process.env.HYDRO_DB === 'sqlite') {
            const file = process.env.HYDRO_SQLITE_PATH || path.resolve(process.cwd(), 'data', 'hydro.db');
            return `sqlite://${file}`;
        }
        let mongourl = `${opts.protocol || 'mongodb'}://`;
        if (opts.username) mongourl += `${opts.username}:${encodeURIComponent(opts.password)}@`;
        mongourl += `${opts.host}:${opts.port}/${opts.name}`;
        if (opts.url || opts.uri) mongourl = opts.url || opts.uri;
        return mongourl;
    }

    async *[Service.init]() {
        const mongourl = await MongoService.getUrl();
        if (MongoService.isSqliteUrl(mongourl || '')) {
            const file = parseSqliteUrl(mongourl!);
            this.sqlite = new SqliteDatabase(file);
            yield () => this.sqlite.close();
            await bus.parallel('database/connect', this.sqlite as any);
            yield this.ctx.interval(() => this.fixExpireAfter(), Time.hour);
            return;
        }
        const url = mongoUri.parse(mongourl);
        this.client = await MongoClient.connect(mongourl);
        yield () => this.client.close();
        this.db = this.client.db(url.database || 'hydro');
        await bus.parallel('database/connect', this.db);
        yield this.ctx.interval(() => this.fixExpireAfter(), Time.hour);
    }

    public get backend() {
        return this.sqlite || this.db;
    }

    public collection<K extends keyof Collections>(c: K): any {
        let coll = this.config.prefix ? `${this.config.prefix}.${c}` : c;
        if (this.config.collectionMap?.[coll]) coll = this.config.collectionMap[coll];
        if (this.sqlite) return this.sqlite.collection(coll) as any;
        return this.db.collection<Collections[K]>(coll);
    }

    public async fixExpireAfter() {
        if (this.sqlite) return;
        // Sometimes mongo's expireAfterSeconds is not working in non-replica set mode;
        const collections = await this.db.listCollections().toArray();
        const ignore = ['system.profile', 'system.users', 'system.version', 'system.views'];
        for (const c of collections) {
            if (ignore.includes(c.name)) continue;
            const coll = this.db.collection(c.name);
            const indexes = await coll.listIndexes().toArray();
            for (const i of indexes) {
                if (typeof i.expireAfterSeconds !== 'number') continue;
                const key = Object.keys(i.key)[0];
                await coll.deleteMany({ [key]: { $lt: new Date(Date.now() - i.expireAfterSeconds * 1000) } });
            }
        }
    }

    public async clearIndexes<T>(coll: Collection<T>, dropIndex?: string[]) {
        if (process.env.NODE_APP_INSTANCE !== '0') return;
        if (this.sqlite) return;
        let existed: any[];
        try {
            existed = await coll.listIndexes().toArray();
        } catch (e) {
            existed = [];
        }
        for (const index of dropIndex) {
            const i = existed.find((t) => t.name === index);
            if (i) {
                logger.info('Drop index %s.%s', coll.collectionName, i.name);
                await coll.dropIndex(i.name);
            }
        }
    }

    public async ensureIndexes<T>(coll: Collection<T>, ...args: IndexDescription[]) {
        if (process.env.NODE_APP_INSTANCE !== '0') return;
        if (this.sqlite) {
            await (coll as any).createIndexes?.(args);
            return;
        }
        let existed: any[];
        try {
            existed = await coll.listIndexes().toArray();
        } catch (e) {
            existed = [];
        }
        for (const index of args) {
            let i = existed.find((t) => t.name === index.name || JSON.stringify(t.key) === JSON.stringify(index.key));
            if (!i && Object.keys(index.key).map((k) => index.key[k]).includes('text')) {
                i = existed.find((t) => t.textIndexVersion);
            }
            index.background = true;
            if (!i) {
                logger.info('Indexing %s.%s with key %o', coll.collectionName, index.name, index.key);
                try {
                    await coll.createIndexes([index]);
                } catch (e) {
                    logger.error('Failed to index %s.%s with key %o: %s', coll.collectionName, index.name, index.key, e);
                }
                continue;
            }
            const isDifferent = () => {
                if (i.v < 2 || i.name !== index.name || JSON.stringify(i.key) !== JSON.stringify(index.key)) return true;
                if (!!i.sparse !== !!index.sparse) return true;
                return false;
            };
            if (isDifferent()) {
                if (i.textIndexVersion) {
                    const cur = Object.keys(i.key).filter((t) => !t.startsWith('_')).map((k) => `${k}:${i.key[k]}`);
                    for (const key of Object.keys(i.weights)) cur.push(`${key}:text`);
                    const wanted = Object.keys(index.key).map((key) => `${key}:${index.key[key]}`);
                    if (cur.sort().join(' ') === wanted.sort().join(' ') && i.name === index.name) continue;
                }
                logger.info('Re-Index %s.%s with key %o', coll.collectionName, index.name, index.key);
                await coll.dropIndex(i.name);
                try {
                    await coll.createIndexes([index]);
                } catch (e) {
                    logger.error('Failed to re-index %s.%s with key %o: %s', coll.collectionName, index.name, index.key, e);
                }
            }
        }
    }

    async paginate<T>(
        cursor: FindCursor<T> | SqliteCursor<T> | any, page: number, pageSize: number,
    ): Promise<[docs: T[], numPages: number, count: number]> {
        if (page <= 0) throw new ValidationError('page');
        if (this.sqlite) {
            const filter = cursor.cursorFilter || {};
            const collName = cursor.namespace?.collection;
            const coll = this.collection(collName as any);
            const [count, pageDocs] = await Promise.all([
                Object.keys(filter).length ? coll.count(filter) : coll.countDocuments(filter),
                cursor.skip((page - 1) * pageSize).limit(pageSize).toArray(),
            ]);
            const numPages = Math.floor((count + pageSize - 1) / pageSize);
            return [pageDocs, numPages, count];
        }
        // this is for mongodb driver v6
        const filter = (cursor as any).cursorFilter;
        const coll = this.db.collection(cursor.namespace.collection as any);
        const [count, pageDocs] = await Promise.all([
            Object.keys(filter).length ? coll.count(filter) : coll.countDocuments(filter),
            cursor.skip((page - 1) * pageSize).limit(pageSize).toArray(),
        ]);
        const numPages = Math.floor((count + pageSize - 1) / pageSize);
        return [pageDocs, numPages, count];
    }

    async ranked<T extends Record<string, any>>(cursor: T[] | FindCursor<T> | SqliteCursor<T> | any, equ: (a: T, b: T) => boolean): Promise<[number, T][]> {
        let last = null;
        let r = 0;
        let count = 0;
        const results = [];
        const docs = cursor instanceof Array ? cursor : await cursor.toArray();
        for (const doc of docs) {
            if ((doc as any).unrank) {
                results.push([0, doc]);
                continue;
            }
            count++;
            if (!last || !equ(last, doc)) r = count;
            last = doc;
            results.push([r, doc]);
        }
        return results;
    }
}

/** @deprecated use ctx.db instead */
const deprecatedDb = new Proxy({} as MongoService, {
    get(target, prop) {
        return app.get('db')?.[prop];
    },
});

export default deprecatedDb;
