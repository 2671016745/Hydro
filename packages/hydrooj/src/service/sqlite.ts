/**
 * Minimal MongoDB-compatible collection layer backed by node:sqlite.
 * Used when config url starts with `sqlite:`. Supports the operators Hydro models use;
 * not a full Mongo replacement — see branch README for limits.
 */
import { DatabaseSync, StatementSync } from 'node:sqlite';
import { EJSON, ObjectId } from 'bson';
import path from 'path';
import fs from 'fs';
const logger = {
    info: (...args: any[]) => console.log('[sqlite]', ...args),
    warn: (...args: any[]) => console.warn('[sqlite]', ...args),
    error: (...args: any[]) => console.error('[sqlite]', ...args),
};


type Doc = Record<string, any>;
type Filter = Record<string, any>;

export function parseSqliteUrl(url: string): string {
    // sqlite://relative.db | sqlite:///abs/path.db | sqlite::memory:
    if (!url.startsWith('sqlite:')) return url;
    let p = url.slice('sqlite:'.length);
    if (p.startsWith('//')) p = p.slice(2);
    else if (p.startsWith('/')) p = p.slice(1);
    else if (p.startsWith('///')) p = p.slice(3);
    if (p === ':memory:' || p === 'memory:') return ':memory:';
    if (path.isAbsolute(p)) return p;
    // sqlite://./data/hydro.db → ./data/hydro.db
    return path.resolve(p);
}

function getPath(obj: Doc, key: string): any {
    if (!key.includes('.')) return obj?.[key];
    let cur: any = obj;
    for (const part of key.split('.')) {
        if (cur == null) return undefined;
        cur = cur[part];
    }
    return cur;
}

function setPath(obj: Doc, key: string, value: any) {
    const parts = key.split('.');
    let cur: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
        cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
}

function unsetPath(obj: Doc, key: string) {
    const parts = key.split('.');
    let cur: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (cur == null) return;
        cur = cur[parts[i]];
    }
    if (cur && typeof cur === 'object') delete cur[parts[parts.length - 1]];
}

function cmp(a: any, b: any): number {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (a instanceof Date) a = a.getTime();
    if (b instanceof Date) b = b.getTime();
    if (typeof a === 'object' && a?.getTimestamp) a = a.getTimestamp?.()?.getTime?.() ?? String(a);
    if (typeof b === 'object' && b?.getTimestamp) b = b.getTimestamp?.()?.getTime?.() ?? String(b);
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
    const as = String(a);
    const bs = String(b);
    return as < bs ? -1 : as > bs ? 1 : 0;
}

function valuesEqual(a: any, b: any): boolean {
    if (a instanceof ObjectId && b instanceof ObjectId) return a.equals(b);
    if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
    if (a instanceof Date || b instanceof Date) {
        const av = a instanceof Date ? a.getTime() : new Date(a).getTime();
        const bv = b instanceof Date ? b.getTime() : new Date(b).getTime();
        return av === bv;
    }
    if (a instanceof ObjectId || b instanceof ObjectId) {
        return String(a?._id ?? a) === String(b?._id ?? b) || String(a) === String(b);
    }
    return a === b || (a !== a && b !== b);
}

function matchValue(docVal: any, cond: any): boolean {
    if (cond === null) return docVal === null || docVal === undefined;
    if (cond instanceof RegExp) return typeof docVal === 'string' && cond.test(docVal);
    if (typeof cond !== 'object' || cond instanceof Date || cond instanceof ObjectId || Array.isArray(cond)) {
        if (Array.isArray(docVal) && !Array.isArray(cond)) return docVal.some((v) => valuesEqual(v, cond));
        return valuesEqual(docVal, cond);
    }
    // operator object
    for (const [op, arg] of Object.entries(cond)) {
        switch (op) {
            case '$eq':
                if (!valuesEqual(docVal, arg) && !(Array.isArray(docVal) && docVal.some((v) => valuesEqual(v, arg)))) return false;
                break;
            case '$ne':
                if (valuesEqual(docVal, arg) || (Array.isArray(docVal) && docVal.some((v) => valuesEqual(v, arg)))) return false;
                break;
            case '$gt':
                if (!(cmp(docVal, arg) > 0)) return false;
                break;
            case '$gte':
                if (!(cmp(docVal, arg) >= 0)) return false;
                break;
            case '$lt':
                if (!(cmp(docVal, arg) < 0)) return false;
                break;
            case '$lte':
                if (!(cmp(docVal, arg) <= 0)) return false;
                break;
            case '$in':
                if (!(arg as any[]).some((v) => valuesEqual(docVal, v) || (Array.isArray(docVal) && docVal.some((d) => valuesEqual(d, v))))) return false;
                break;
            case '$nin':
                if ((arg as any[]).some((v) => valuesEqual(docVal, v) || (Array.isArray(docVal) && docVal.some((d) => valuesEqual(d, v))))) return false;
                break;
            case '$exists':
                const ex = docVal !== undefined;
                if (Boolean(arg) !== ex) return false;
                break;
            case '$regex':
                {
                    const re = arg instanceof RegExp ? arg : new RegExp(arg as string, typeof cond.$options === 'string' ? cond.$options : '');
                    if (typeof docVal !== 'string' || !re.test(docVal)) return false;
                }
                break;
            case '$options':
                break;
            case '$not':
                if (matchValue(docVal, arg)) return false;
                break;
            case '$size':
                if (!Array.isArray(docVal) || docVal.length !== arg) return false;
                break;
            case '$all':
                if (!Array.isArray(docVal) || !(arg as any[]).every((v) => docVal.some((d) => valuesEqual(d, v)))) return false;
                break;
            case '$elemMatch':
                if (!Array.isArray(docVal) || !docVal.some((el) => matches(el, arg as Filter))) return false;
                break;
            default:
                logger.warn('sqlite: unsupported operator %s', op);
                return false;
        }
    }
    return true;
}

export function matches(doc: Doc, filter: Filter): boolean {
    if (!filter) return true;
    for (const [key, cond] of Object.entries(filter)) {
        if (key === '$and') {
            if (!(cond as Filter[]).every((f) => matches(doc, f))) return false;
            continue;
        }
        if (key === '$or') {
            if (!(cond as Filter[]).some((f) => matches(doc, f))) return false;
            continue;
        }
        if (key === '$nor') {
            if ((cond as Filter[]).some((f) => matches(doc, f))) return false;
            continue;
        }
        if (key.startsWith('$')) continue;
        if (!matchValue(getPath(doc, key), cond)) return false;
    }
    return true;
}

function applyUpdate(doc: Doc, update: Doc) {
    for (const [op, fields] of Object.entries(update)) {
        if (!op.startsWith('$')) {
            // replace-style
            const id = doc._id;
            Object.keys(doc).forEach((k) => delete doc[k]);
            Object.assign(doc, update, { _id: id });
            return;
        }
        switch (op) {
            case '$set':
                for (const [k, v] of Object.entries(fields as Doc)) setPath(doc, k, v);
                break;
            case '$unset':
                for (const k of Object.keys(fields as Doc)) unsetPath(doc, k);
                break;
            case '$inc':
                for (const [k, v] of Object.entries(fields as Doc)) setPath(doc, k, (getPath(doc, k) || 0) + (v as number));
                break;
            case '$push':
                for (const [k, v] of Object.entries(fields as Doc)) {
                    const arr = getPath(doc, k) || [];
                    if (!Array.isArray(arr)) throw new Error('$push target is not array');
                    arr.push(v);
                    setPath(doc, k, arr);
                }
                break;
            case '$pull':
                for (const [k, v] of Object.entries(fields as Doc)) {
                    const arr = getPath(doc, k);
                    if (!Array.isArray(arr)) continue;
                    setPath(doc, k, arr.filter((el) => !valuesEqual(el, v) && !(v && typeof v === 'object' && matches(el, v))));
                }
                break;
            case '$addToSet':
                for (const [k, v] of Object.entries(fields as Doc)) {
                    const arr = getPath(doc, k) || [];
                    if (!arr.some((el) => valuesEqual(el, v))) arr.push(v);
                    setPath(doc, k, arr);
                }
                break;
            case '$pop':
                for (const [k, v] of Object.entries(fields as Doc)) {
                    const arr = getPath(doc, k);
                    if (!Array.isArray(arr) || !arr.length) continue;
                    if (v === 1 || v === '1') arr.pop();
                    else arr.shift();
                    setPath(doc, k, arr);
                }
                break;
            default:
                logger.warn('sqlite: unsupported update op %s', op);
        }
    }
}

function projectDoc(doc: Doc, projection?: Doc): Doc {
    if (!projection || !Object.keys(projection).length) return doc;
    const include = Object.entries(projection).some(([k, v]) => k !== '_id' && (v === 1 || v === true));
    const out: Doc = {};
    for (const [k, v] of Object.entries(projection)) {
        if (k === '_id') {
            if (!v) continue;
            out._id = doc._id;
            continue;
        }
        if (v === 1 || v === true) {
            const val = getPath(doc, k);
            if (val !== undefined) setPath(out, k, val);
        } else if (v === 0 || v === false) {
            // exclusion projection
        }
    }
    if (!include) {
        // exclusion mode
        const result = { ...doc };
        for (const [k, v] of Object.entries(projection)) {
            if (v === 0 || v === false) unsetPath(result, k);
        }
        return result;
    }
    if (projection._id === 0) delete out._id;
    else if (out._id === undefined && doc._id !== undefined) out._id = doc._id;
    return out;
}

export class SqliteCursor<T extends Doc = Doc> {
    public cursorFilter: Filter = {};
    public namespace = { collection: '' };
    private _sort: Doc | null = null;
    private _skip = 0;
    private _limit = 0;
    private _projection: Doc | null = null;

    private docs: T[];
    constructor(docs: T[], collectionName: string) {
        this.docs = docs;
        this.namespace.collection = collectionName;
        this.cursorFilter = {};
    }

    setFilter(f: Filter) {
        this.cursorFilter = f || {};
        return this;
    }

    sort(s: Doc) {
        this._sort = s;
        return this;
    }

    skip(n: number) {
        this._skip = n || 0;
        return this;
    }

    limit(n: number) {
        this._limit = n || 0;
        return this;
    }

    project(p: Doc) {
        this._projection = p;
        return this;
    }

    private materialize(): T[] {
        let list = this.docs.filter((d) => matches(d, this.cursorFilter));
        if (this._sort) {
            const entries = Object.entries(this._sort);
            list = [...list].sort((a, b) => {
                for (const [k, dir] of entries) {
                    const c = cmp(getPath(a, k), getPath(b, k));
                    if (c) return c * (dir === -1 ? -1 : 1);
                }
                return 0;
            });
        }
        if (this._skip) list = list.slice(this._skip);
        if (this._limit > 0) list = list.slice(0, this._limit);
        return list.map((d) => projectDoc(d, this._projection || undefined)) as T[];
    }

    async toArray(): Promise<T[]> {
        return this.materialize();
    }

    async next(): Promise<T | null> {
        const list = this.materialize();
        return list[0] || null;
    }

    async count(): Promise<number> {
        return this.docs.filter((d) => matches(d, this.cursorFilter)).length;
    }

    async forEach(fn: (doc: T) => void) {
        for (const d of this.materialize()) fn(d);
    }

    [Symbol.asyncIterator]() {
        const list = this.materialize();
        let i = 0;
        return {
            async next() {
                if (i >= list.length) return { done: true, value: undefined };
                return { done: false, value: list[i++] };
            },
        };
    }
}

function aggExpr(doc: Doc, expr: any): any {
    if (expr == null) return expr;
    if (typeof expr === 'string' && expr.startsWith('$')) return getPath(doc, expr.slice(1));
    if (Array.isArray(expr)) return expr.map((e) => aggExpr(doc, e));
    if (typeof expr === 'object') {
        const keys = Object.keys(expr);
        if (keys.length === 1 && keys[0].startsWith('$')) {
            const op = keys[0];
            const arg = (expr as Doc)[op];
            switch (op) {
                case '$objectToArray': {
                    const obj = aggExpr(doc, arg);
                    if (!obj || typeof obj !== 'object') return [];
                    return Object.entries(obj).map(([k, v]) => ({ k, v }));
                }
                case '$min':
                    return Array.isArray(arg) ? Math.min(...arg.map((a) => Number(aggExpr(doc, a)))) : Number(aggExpr(doc, arg));
                case '$max':
                    return Array.isArray(arg) ? Math.max(...arg.map((a) => Number(aggExpr(doc, a)))) : Number(aggExpr(doc, arg));
                case '$sum':
                    return Array.isArray(arg)
                        ? arg.reduce((s, a) => s + Number(aggExpr(doc, a) || 0), 0)
                        : Number(aggExpr(doc, arg) || 0);
                case '$add':
                    return (arg as any[]).reduce((s, a) => s + Number(aggExpr(doc, a) || 0), 0);
                case '$multiply':
                    return (arg as any[]).reduce((s, a) => s * Number(aggExpr(doc, a) || 1), 1);
                case '$concat':
                    return (arg as any[]).map((a) => String(aggExpr(doc, a) ?? '')).join('');
                case '$literal':
                    return arg;
                case '$type':
                    return typeof aggExpr(doc, arg);
                default:
                    // nested object expr
                    break;
            }
        }
        const out: Doc = {};
        for (const [k, v] of Object.entries(expr)) out[k] = aggExpr(doc, v);
        return out;
    }
    return expr;
}

export class SqliteAggregateCursor {
    private rows: Doc[];
    private pipeline: Doc[];
    constructor(rows: Doc[], pipeline: Doc[]) {
        this.rows = rows;
        this.pipeline = pipeline;
    }

    private run(): Doc[] {
        let list = [...this.rows];
        for (const stage of this.pipeline) {
            const [name, arg] = Object.entries(stage)[0] as [string, any];
            switch (name) {
                case '$match':
                    list = list.filter((d) => matches(d, arg));
                    break;
                case '$project':
                    list = list.map((d) => {
                        const out: Doc = {};
                        for (const [k, v] of Object.entries(arg as Doc)) {
                            if (v === 0 || v === false) continue;
                            if (v === 1 || v === true) setPath(out, k, getPath(d, k));
                            else setPath(out, k, aggExpr(d, v));
                        }
                        return out;
                    });
                    break;
                case '$unwind': {
                    const field = String(arg).startsWith('$') ? String(arg).slice(1) : String(arg);
                    const next: Doc[] = [];
                    for (const d of list) {
                        const arr = getPath(d, field);
                        if (Array.isArray(arr)) {
                            for (const el of arr) {
                                const copy = { ...d };
                                setPath(copy, field, el);
                                next.push(copy);
                            }
                        } else if (arr != null) {
                            const copy = { ...d };
                            setPath(copy, field, arr);
                            next.push(copy);
                        }
                    }
                    list = next;
                    break;
                }
                case '$group': {
                    const idExpr = arg._id;
                    const groups = new Map<string, { _id: any; docs: Doc[] }>();
                    for (const d of list) {
                        const id = aggExpr(d, idExpr);
                        const key = EJSON.stringify(id ?? null);
                        if (!groups.has(key)) groups.set(key, { _id: id, docs: [] });
                        groups.get(key)!.docs.push(d);
                    }
                    list = [...groups.values()].map(({ _id, docs }) => {
                        const out: Doc = { _id };
                        for (const [k, v] of Object.entries(arg as Doc)) {
                            if (k === '_id') continue;
                            const acc = v as Doc;
                            const op = Object.keys(acc)[0];
                            const expr = acc[op];
                            switch (op) {
                                case '$min':
                                    out[k] = docs.map((d) => aggExpr(d, expr)).reduce((a, b) => (cmp(a, b) <= 0 ? a : b));
                                    break;
                                case '$max':
                                    out[k] = docs.map((d) => aggExpr(d, expr)).reduce((a, b) => (cmp(a, b) >= 0 ? a : b));
                                    break;
                                case '$sum':
                                    out[k] = docs.reduce((s, d) => s + Number(aggExpr(d, expr) || 0), 0);
                                    break;
                                case '$avg':
                                    out[k] = docs.reduce((s, d) => s + Number(aggExpr(d, expr) || 0), 0) / (docs.length || 1);
                                    break;
                                case '$first':
                                    out[k] = aggExpr(docs[0], expr);
                                    break;
                                case '$last':
                                    out[k] = aggExpr(docs[docs.length - 1], expr);
                                    break;
                                case '$push':
                                    out[k] = docs.map((d) => aggExpr(d, expr));
                                    break;
                                case '$addToSet':
                                    out[k] = [...new Map(docs.map((d) => {
                                        const val = aggExpr(d, expr);
                                        return [EJSON.stringify(val ?? null), val] as const;
                                    })).values()];
                                    break;
                                default:
                                    out[k] = aggExpr(docs[0], expr);
                            }
                        }
                        return out;
                    });
                    break;
                }
                case '$sort':
                    {
                        const entries = Object.entries(arg as Doc);
                        list = [...list].sort((a, b) => {
                            for (const [k, dir] of entries) {
                                const c = cmp(getPath(a, k), getPath(b, k));
                                if (c) return c * (dir === -1 ? -1 : 1);
                            }
                            return 0;
                        });
                    }
                    break;
                case '$skip':
                    list = list.slice(arg);
                    break;
                case '$limit':
                    list = list.slice(0, arg);
                    break;
                case '$count':
                    list = [{ [arg]: list.length }];
                    break;
                default:
                    logger.warn('sqlite: unsupported aggregate stage %s', name);
            }
        }
        return list;
    }

    async toArray(): Promise<Doc[]> {
        return this.run();
    }
}

export class SqliteCollection<T extends Doc = Doc> {
    private db: DatabaseSync;
    public collectionName: string;
    constructor(db: DatabaseSync, collectionName: string) {
        this.db = db;
        this.collectionName = collectionName;
        db.exec(`CREATE TABLE IF NOT EXISTS docs (
            collection TEXT NOT NULL,
            id TEXT NOT NULL,
            data TEXT NOT NULL,
            PRIMARY KEY (collection, id)
        )`);
    }

    private stmt(sql: string): StatementSync {
        return this.db.prepare(sql);
    }

    private idOf(doc: Doc): string {
        const id = doc._id;
        if (id == null) return String(new ObjectId());
        return String(id);
    }

    private loadAll(): T[] {
        const rows = this.stmt('SELECT data FROM docs WHERE collection = ?').all(this.collectionName) as any[];
        return rows.map((r) => EJSON.deserialize(JSON.parse(r.data)));
    }

    private save(id: string, doc: Doc) {
        const payload = JSON.stringify(EJSON.serialize({ ...doc, _id: doc._id ?? id }));
        this.stmt('INSERT INTO docs (collection, id, data) VALUES (?, ?, ?) ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data')
            .run(this.collectionName, id, payload);
    }

    private removeIds(ids: string[]) {
        for (const id of ids) {
            this.stmt('DELETE FROM docs WHERE collection = ? AND id = ?').run(this.collectionName, id);
        }
    }

    find(filter: Filter = {}, options: Doc = {}) {
        const cur = new SqliteCursor<T>(this.loadAll(), this.collectionName);
        cur.setFilter(filter);
        if (options.sort) cur.sort(options.sort);
        if (options.skip) cur.skip(options.skip);
        if (options.limit) cur.limit(options.limit);
        if (options.projection || options.fields) cur.project(options.projection || options.fields);
        return cur;
    }

    async findOne(filter: Filter = {}, options: Doc = {}): Promise<T | null> {
        const docs = await (this.find(filter, { ...options, limit: 1 }) as SqliteCursor<T>).toArray();
        return docs[0] || null;
    }

    async insertOne(doc: Doc) {
        const id = this.idOf(doc);
        const withId = { ...doc, _id: doc._id ?? (ObjectId.isValid(id) && String(id).length === 24 ? new ObjectId(id) : id) };
        this.save(id, withId);
        return { insertedId: withId._id, acknowledged: true };
    }

    async insertMany(docs: Doc[]) {
        const ids: any[] = [];
        for (const d of docs) {
            const r = await this.insertOne(d);
            ids.push(r.insertedId);
        }
        return { insertedIds: ids, insertedCount: ids.length, acknowledged: true };
    }

    private updateInternal(filter: Filter, update: Doc, multi: boolean, upsert = false) {
        const all = this.loadAll();
        const hits = all.filter((d) => matches(d, filter));
        let modified = 0;
        for (const d of hits) {
            applyUpdate(d, update);
            this.save(String(d._id), d);
            modified++;
            if (!multi) break;
        }
        if (!hits.length && upsert) {
            const base: Doc = { ...filter };
            // strip operators from filter for upsert base
            for (const k of Object.keys(base)) {
                if (k.startsWith('$') || (base[k] && typeof base[k] === 'object' && !(base[k] instanceof Date) && !(base[k] instanceof ObjectId) && Object.keys(base[k]).some((x) => x.startsWith('$')))) {
                    delete base[k];
                }
            }
            applyUpdate(base, update);
            if (!base._id) base._id = new ObjectId();
            this.save(String(base._id), base);
            return { matchedCount: 0, modifiedCount: 0, upsertedCount: 1, upsertedId: base._id, acknowledged: true };
        }
        return { matchedCount: hits.length ? (multi ? hits.length : Math.min(1, hits.length)) : 0, modifiedCount: modified, upsertedCount: 0, acknowledged: true };
    }

    async updateOne(filter: Filter, update: Doc, options: Doc = {}) {
        return this.updateInternal(filter, update, false, !!options.upsert);
    }

    async updateMany(filter: Filter, update: Doc, options: Doc = {}) {
        return this.updateInternal(filter, update, true, !!options.upsert);
    }

    async replaceOne(filter: Filter, replacement: Doc, options: Doc = {}) {
        const all = this.loadAll();
        const hit = all.find((d) => matches(d, filter));
        if (!hit) {
            if (options.upsert) return this.insertOne(replacement);
            return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
        }
        const next = { ...replacement, _id: hit._id };
        this.save(String(hit._id), next);
        return { matchedCount: 1, modifiedCount: 1, acknowledged: true };
    }

    private deleteInternal(filter: Filter, multi: boolean) {
        const all = this.loadAll();
        const hits = all.filter((d) => matches(d, filter));
        const ids = hits.map((d) => String(d._id));
        this.removeIds(multi ? ids : ids.slice(0, 1));
        return { deletedCount: multi ? ids.length : ids.slice(0, 1).length, acknowledged: true };
    }

    async deleteOne(filter: Filter = {}) {
        return this.deleteInternal(filter, false);
    }

    async deleteMany(filter: Filter = {}) {
        return this.deleteInternal(filter, true);
    }

    async countDocuments(filter: Filter = {}) {
        return this.loadAll().filter((d) => matches(d, filter)).length;
    }

    async count(filter: Filter = {}) {
        return this.countDocuments(filter);
    }

    async estimatedDocumentCount() {
        return this.loadAll().length;
    }

    async distinct(key: string, filter: Filter = {}) {
        const vals = new Map<string, any>();
        for (const d of this.loadAll().filter((x) => matches(x, filter))) {
            const v = getPath(d, key);
            vals.set(EJSON.stringify(v ?? null), v);
        }
        return [...vals.values()];
    }

    async findOneAndUpdate(filter: Filter, update: Doc, options: Doc = {}) {
        const all = this.loadAll();
        const hit = all.find((d) => matches(d, filter));
        if (!hit) {
            if (options.upsert) {
                const inserted = await this.insertOne(typeof update.$set === 'object' ? { ...filter, ...update.$set } : {});
                return { value: null, upsertedId: inserted.insertedId, lastErrorObject: { n: 0, updatedExisting: false, upserted: inserted.insertedId } };
            }
            return { value: null, lastErrorObject: { n: 0, updatedExisting: false } };
        }
        const before = { ...hit };
        applyUpdate(hit, update);
        this.save(String(hit._id), hit);
        const value = options.returnDocument === 'before' ? before : hit;
        return { value, lastErrorObject: { n: 1, updatedExisting: true } };
    }

    async findOneAndDelete(filter: Filter, options: Doc = {}) {
        const all = this.loadAll();
        const hit = all.find((d) => matches(d, filter));
        if (!hit) return { value: null };
        this.removeIds([String(hit._id)]);
        return { value: hit };
    }

    async findOneAndReplace(filter: Filter, replacement: Doc, options: Doc = {}) {
        return this.replaceOne(filter, replacement, options).then(() => this.findOne(filter));
    }

    aggregate(pipeline: Doc[] = []) {
        return new SqliteAggregateCursor(this.loadAll(), pipeline);
    }

    async createIndexes(indexes: any[] = []) {
        // stored as no-op metadata; filters still run in JS
        for (const idx of indexes) {
            logger.info('sqlite: createIndex %s %o (metadata only)', this.collectionName, idx?.key || idx);
        }
    }

    async createIndex(key: any, options: any = {}) {
        return this.createIndexes([{ key, ...options }]);
    }

    async listIndexes() {
        return {
            toArray: async () => [{ name: '_id_', key: { _id: 1 }, v: 2 }],
        };
    }

    async dropIndex() {
        return true;
    }

    async dropIndexes() {
        return true;
    }

    async bulkWrite(ops: any[]) {
        let n = 0;
        for (const op of ops) {
            if (op.insertOne) {
                await this.insertOne(op.insertOne.document);
                n++;
            } else if (op.updateOne) {
                await this.updateOne(op.updateOne.filter, op.updateOne.update, op.updateOne);
                n++;
            } else if (op.updateMany) {
                await this.updateMany(op.updateMany.filter, op.updateMany.update, op.updateMany);
                n++;
            } else if (op.deleteOne) {
                await this.deleteOne(op.deleteOne.filter);
                n++;
            } else if (op.deleteMany) {
                await this.deleteMany(op.deleteMany.filter);
                n++;
            } else if (op.replaceOne) {
                await this.replaceOne(op.replaceOne.filter, op.replaceOne.replacement, op.replaceOne);
                n++;
            }
        }
        return { ok: 1, n };
    }
}

export class SqliteDatabase {
    private file: string;
    raw: DatabaseSync;
    constructor(file: string) {
        this.file = file;
        if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
        this.raw = new DatabaseSync(file);
        this.raw.exec('PRAGMA journal_mode = WAL;');
        this.raw.exec('PRAGMA busy_timeout = 5000;');
        logger.info('sqlite: opened %s', file);
    }

    collection<T extends Doc = Doc>(name: string) {
        return new SqliteCollection<T>(this.raw, name);
    }

    listCollections() {
        return {
            toArray: async () => {
                const rows = this.raw.prepare('SELECT DISTINCT collection AS name FROM docs').all() as any[];
                return rows;
            },
        };
    }

    async dropDatabase() {
        this.raw.exec('DELETE FROM docs');
    }

    close() {
        try {
            this.raw.close();
        } catch { /* ignore */ }
    }
}

export default SqliteDatabase;
