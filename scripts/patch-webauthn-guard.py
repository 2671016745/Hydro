from pathlib import Path

p = Path(r'D:\github\Hydro\packages\ui-default\public\604.7f7453.chunk.js')
s = p.read_text(encoding='utf-8')
old = 'async function c(){if(r||!window.isSecureContext||(r=!0,!await(0,e.ZF)()))return;'
new = 'async function c(){if(r||!window.isSecureContext||!document.querySelector("[autocomplete~=webauthn]")||(r=!0,!await(0,e.ZF)()))return;'
print('found', old in s)
if old not in s:
    raise SystemExit('pattern not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('patched', p.stat().st_size)
