from pathlib import Path

nav = Path(r'D:\github\Hydro\packages\ui-default\templates\partials\nav.html')
lines = nav.read_text(encoding='utf-8').splitlines(keepends=True)
count = 0
for i, line in enumerate(lines):
    if 'class="nav__item"' in line and 'user_detail' in line and 'expand_more' in line and 'nav__user-avatar' not in line:
        lines[i] = line.replace(
            'class="nav__item">',
            'class="nav__item"><img class="small user-profile-avatar v-center nav__user-avatar" src="{{ avatarUrl(handler.user.avatar, 32) }}" width="20" height="20" alt="">',
            1,
        )
        count += 1
        break
nav.write_text(''.join(lines), encoding='utf-8')
print('replaced', count)
print(Path(r'D:\github\Hydro\packages\ui-default\templates\partials\nav.html').read_text(encoding='utf-8').splitlines()[59])
