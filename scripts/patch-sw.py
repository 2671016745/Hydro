from pathlib import Path

p = Path(r'D:\github\Hydro\packages\ui-default\public\service-worker.js')
s = p.read_text(encoding='utf-8')
old = 'const g=(await Promise.all(d.map(f=>caches.match(f)))).find(f=>f);'
new = 'const g=(await Promise.all(d.map(f=>caches.open(s).then(k=>k.match(f))))).find(f=>f);'
print('found', old in s)
s = s.replace(old, new, 1)
print('caches.match left', s.count('caches.match'))
p.write_text(s, encoding='utf-8')
