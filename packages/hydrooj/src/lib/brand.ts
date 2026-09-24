/**
 * Fork branding defaults — applied automatically on boot so restarts
 * never lose the school logo / site name / domain avatar.
 */
export const BRAND = {
    siteName: '奎光',
    navLogo: '/components/navigation/nav-logo-small_dark.png',
    domainAvatar: 'url:/img/guiguang-school-badge.png',
} as const;

type SystemLike = {
    get(key: string): any;
    set(key: string, value: any, broadcast?: boolean): Promise<any>;
};

type CollLike = {
    findOne(filter: any): Promise<any>;
    updateOne(filter: any, update: any, options?: any): Promise<any>;
};

/** Seed system settings when missing/empty. */
export async function ensureSystemBranding(system: SystemLike) {
    const pairs: [string, string][] = [
        ['ui-default.nav_logo_dark', BRAND.navLogo],
        ['server.name', BRAND.siteName],
    ];
    for (const [key, value] of pairs) {
        const cur = system.get(key);
        if (cur === undefined || cur === null || cur === '') {
            await system.set(key, value, false);
        }
    }
}

/** Seed default domain name/avatar when missing. */
export async function ensureDomainBranding(coll: CollLike, onUpdated?: () => void) {
    const ddoc = await coll.findOne({ _id: 'system' });
    const $set: Record<string, any> = {};
    if (!ddoc) {
        $set.name = BRAND.siteName;
        $set.avatar = BRAND.domainAvatar;
        $set.lower = 'system';
    } else {
        if (!ddoc.name || ddoc.name === 'New domain') $set.name = BRAND.siteName;
        if (!ddoc.avatar) $set.avatar = BRAND.domainAvatar;
    }
    if (Object.keys($set).length) {
        await coll.updateOne({ _id: 'system' }, { $set }, { upsert: true });
        onUpdated?.();
    }
}
