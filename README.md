# ✨ Nikki Nik's Magic Meter — GitHub Pages Edition

A Christmas-magic experience for **DAKboard**, controlled by parents from an iPhone.

**GitHub only.** No Google Sheets, no Supabase, no GitLab, no database, no external scripts.

## Two pages

- `index.html` — beautiful, full-screen **public meter** for DAKboard, with snow, a glowing dial, animation, and an elf message.
- `admin.html` — **parent control panel** with an adjustable magic percentage (0–100), presets, and a custom message. Edits are saved to GitHub through its Contents API.

The one published data file is `data/magic.json`. When a parent presses **Publish**, GitHub commits an updated `magic.json` to the repository. The meter first attempts to read the latest file from `raw.githubusercontent.com` every 30 seconds, falling back to the GitHub Pages copy if necessary. GitHub CDN caching and connection conditions can delay it: **this is near-real-time polling, not an instant push channel**. Pages also republishes with each push.

## Setup (one-time)

1. Your public repository is already created: [no7eafclover/elf-magic-meter](https://github.com/no7eafclover/elf-magic-meter).
2. The site files are committed to this repository directly.
3. In your GitHub repository, go to **Settings → Pages → Build and deployment → Source → GitHub Actions**. The included `.github/workflows/pages.yml` deploys the website whenever `main` changes. In Actions, verify `Publish Nikki Nik Magic Meter` completes. If GitHub requires an initial Pages setup, follow the repository's Pages settings prompts.
4. The public display will appear at:
   `https://no7eafclover.github.io/elf-magic-meter/`
5. Your parent control page will be:
   `https://no7eafclover.github.io/elf-magic-meter/admin.html`
6. Create a **fine-grained personal access token** at [GitHub → Settings → Developer settings → Personal access tokens (fine-grained)](https://github.com/settings/personal-access-tokens/new):
   - Resource owner: `no7eafclover`
   - Repository access: **Only select repositories** → `elf-magic-meter`
   - Repository permissions: **Contents: Read and write** (Metadata: Read automatically included)
   - Give the token a short expiration (such as 30–90 days). Replace it when it expires.
7. On the parent control page, paste the token into **GitHub fine-grained access token**, then tap **Connect**. The page reads the current value and message. Adjust, preview, and tap **Publish to Magic Meter**. Don't put the token into `config.js`, GitHub repository code, URL parameters, or screenshots. The token is kept in memory, not stored by the page; you must re-enter it after reloading.
8. In DAKboard, add a **Website / iframe** block on your custom screen and embed only the public display URL from step 4. Configure full-width/full-height and let the page refresh its own data automatically. DAKboard paid plans support HTTPS website embedding where permitted. Test on your actual DAKboard device.

## Data schema

```json
{
  "value": 75,
  "message": "Nikki Nik says the Christmas magic is growing!",
  "updated_at": null
}
```

`value` must be an integer in the inclusive range 0–100. `message` is limited to 220 characters. `updated_at` is set to an ISO-8601 timestamp on each parent update.

## Security notes

- `admin.html` is **not hidden or login-restricted** by GitHub Pages. Anyone who knows the URL can view the form, but writing requires a valid GitHub token with repository permission. GitHub Pages cannot protect a single route server-side.
- Use a **fine-grained repository-limited** token, not a broad classic PAT. Never share the token with your children or store it in the repository.
- The site runs no third-party JavaScript, and the access token stays in page memory until disconnect or reload. Use your own trusted device and HTTPS.
- Public Github Pages data and published messages are viewable by anyone with the URL. Don't include sensitive family or personal information.
- GitHub Raw is a public CDN and may serve a cached version, even with a cache-busting URL. The display falls back to the published Pages copy. Actual update latency may be seconds to minutes, and is not guaranteed.
- Token expiration and GitHub API rate limits can affect the admin page; the public display does not require API authentication.
- For true private login and guaranteed instant updates, you'd need a separate backend, which this GitHub-only implementation deliberately avoids.

## Configuration

`config.js` includes the `owner`, `repo`, `branch`, `dataPath`, and `refreshMs` defaults. On a standard `username.github.io/project/` Pages URL, both pages auto-detect the username and project name. If you rename `main` or use a custom domain, edit `config.js` accordingly.

## Local preview

Run `python3 -m http.server 8000` in this directory, then visit `http://localhost:8000/` for the public meter or `http://localhost:8000/admin.html` for the admin preview. Publishing works only after the repository exists and you have a valid GitHub token. The local preview will show its bundled data file until the GitHub Raw source is available.

## Troubleshooting

- **Admin 404 when connecting**: check that repo name matches the published GitHub project and `data/magic.json` is in its default branch.
- **Admin 403**: check that your fine-grained token permits `Contents: Read and write` on the correct repository.
- **No public update yet**: check the file's most recent GitHub commit, give CDN and Pages time to refresh, and ensure the DAKboard iframe can load the site.
- **Page not appearing on DAKboard**: confirm the Page is public HTTPS and test it in DAKboard's Website/iframe block; frame policies or browser/firmware constraints can interfere.
- **Token leaked**: revoke it immediately in GitHub Settings and generate a new limited token.
