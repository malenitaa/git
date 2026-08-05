# Contribution Creatures

[![Live demo](https://img.shields.io/badge/demo-live-6b46c1)](https://malenitaa.github.io/git/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

Turns any GitHub user's **contribution graph** into a pixel-art scene
where little creatures — slime, cat, ghost — hop between the days they
were actually active. No backend, no account needed, no build step: pure
HTML/CSS/JS.

## Try it

### 👉 [malenitaa.github.io/git](https://malenitaa.github.io/git/?user=torvalds)

Type any public GitHub username, or add `?user=someone` to the URL to
share a specific one.

## FAQ

**Does it need my GitHub login?**
No, it only reads public contribution data — no account, no token.

**Does it store any of my data?**
No. It caches the contribution data for 15 minutes in your own browser
(`localStorage`) so refreshing doesn't re-fetch, and nothing else.

**Is it free?**
Yes, no ads, no hidden cost.

## Host your own copy

No coding required — see [`INSTALL.md`](./INSTALL.md) for a
step-by-step, no-terminal guide (GitHub Pages or Vercel, both free).

## For developers

No build step — any static server works:

```bash
git clone https://github.com/malenitaa/git.git
cd git
python3 -m http.server 8000
```

Open `http://localhost:8000?user=YOUR_USERNAME`.

## Enjoyed it?

If this was useful and you'd like to support the project:

- [Cafecito](https://cafecito.app/rezamalena)
- [Ko-fi](https://ko-fi.com/malenitaa)

## License

MIT — see [LICENSE](LICENSE).
