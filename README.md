# Akram Ali — Portfolio (Noir Signal)

Personal portfolio for **Akram Ali**, Software Engineer. Static HTML/CSS/JS with project case studies, resume, and assets. Dark cinematic **Noir Signal** design with Version 2 content hierarchy (software applications first, then data & analytics, then professional web work).

## Live site

Published with **GitHub Pages** from this repository:

- Source: branch `main`, folder `/` (repository root)
- Custom domain: **https://akramalidev.com**
- GitHub Pages fallback: https://akrmdev.github.io/Porfolio-Website/

### Custom domain DNS (Cloudflare)

Point the apex and `www` at GitHub Pages:

| Type | Name | Content |
| --- | --- | --- |
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |
| `CNAME` | `www` | `akrmdev.github.io` |

In Cloudflare, set those records to **DNS only** (grey cloud) until the GitHub Pages SSL certificate issues, then you can enable the proxy if you want. After DNS propagates, turn on **Enforce HTTPS** in the repo’s Pages settings.

The repo root includes a `CNAME` file (`akramalidev.com`) so Pages binds the custom domain.

### Clean URLs

Pages use folder routes (no `.html` in the address bar), for example:

- `https://akramalidev.com/` — home
- `https://akramalidev.com/projects/footprint/`
- `https://akramalidev.com/experience/web-platform-development/`
- `https://akramalidev.com/education/wayne-state/`

Legacy `*.html` paths redirect to the matching folder. Old bookmarks keep working.

## Local preview

Serve the repo root (so directory URLs resolve):

```bash
python3 -m http.server 5173
```

Then open `http://127.0.0.1:5173/` (not a raw `index.html` file path).


