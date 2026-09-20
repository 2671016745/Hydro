import assert from 'node:assert/strict';
import test from 'node:test';
import { pkceChallenge, randomVerifier } from './pkce';

test('PKCE S256 matches RFC 7636 example', () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    assert.equal(pkceChallenge(verifier), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
});

test('random verifier is URL-safe and sufficiently long', () => {
    const verifier = randomVerifier();
    assert.match(verifier, /^[A-Za-z0-9_-]+$/);
    assert.ok(verifier.length >= 43);
});
