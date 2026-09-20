import { createHash, randomBytes } from 'node:crypto';

/** PKCE S256: code_challenge = BASE64URL(SHA256(code_verifier)) */
export function pkceChallenge(verifier: string) {
    return createHash('sha256')
        .update(verifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export function randomVerifier() {
    return randomBytes(32).toString('base64url');
}
