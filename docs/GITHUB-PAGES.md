# Publish Geeky on GitHub Pages

The repository is ready for a GitHub Actions Pages deployment. The landing page, interactive demo, documentation, player, examples, and downloadable assets use relative links that work under `/geeky-animation/`.

## One-time setup

1. Push the prepared Pages commit to `main`.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open **Actions → Deploy Geeky to GitHub Pages → Run workflow**, choose `main`, and run it. A later push to `main` also starts a deployment.
5. Wait for both the `build` and `deploy` jobs to succeed. Open the URL shown by the `github-pages` deployment.

Expected default project URL after a successful deployment:

`https://guategeeks.github.io/geeky-animation/`

Expected demo URL:

`https://guategeeks.github.io/geeky-animation/demo/`

These are expected URLs, not confirmation that the site has been enabled or deployed. A custom domain or organization policy can change the final URL or require approval.

## How deployment works

- `.github/workflows/pages.yml` runs on pushes to `main` and manual dispatch.
- The build job has only `contents: read`. Checkout does not persist credentials.
- It runs the player unit tests, assembles `_site`, and checks links and artifact contents before uploading.
- The separate deployment job has only `pages: write` and `id-token: write`, targets the standard `github-pages` environment, and runs only for `main`.
- Only official GitHub actions are used, pinned to immutable commit SHAs. No custom secret, personal access token, package installation, or third-party hosting account is required.
- Pages configuration uses `enablement: false`; the workflow does not enable Pages automatically. Configure the source in Settings first.
- `tools/build-pages.py` uses an explicit public-file allowlist. It excludes Git metadata, workflows, tests, export caches and development tooling from the upload.
- Existing animation exports are copied unchanged. Pages publishing does not run the full raster/vector regeneration pipeline.

The workflow uploads a prepared static artifact directly; Jekyll and a `gh-pages` branch are not needed.

## Local checks and preview

From the repository root:

```sh
node tests/player.test.mjs
python3 tools/build-pages.py
python3 tests/pages.test.py
python3 -m http.server 8000 --directory _site
```

Open `http://localhost:8000/`. The static checks resolve all HTML links at both the domain root and `/geeky-animation/`, check local CSS/module references, confirm manifest assets exist, and reject private/development artifacts. They are not a live-browser or native-device test.

To update the landing page, edit `index.html` and `site.css`. `_site` is disposable generated output and is ignored by Git. Run the checks before pushing.

## If deployment is blocked

- **Pages site not found / configuration failure:** Set Settings → Pages → Source to GitHub Actions, then rerun the workflow.
- **Workflow unavailable or actions blocked:** Check repository and organization Actions policies with an administrator. The workflow requires only the official pinned actions it lists.
- **Deployment waiting for approval:** Review the `github-pages` environment's deployment protection rules. Do not remove protection rules merely to bypass a pending review.
- **Incorrect URL:** Use the successful deployment's actual URL, especially if a custom domain is configured.

## Official references

- [GitHub: using custom workflows with Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub: configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Official configure-pages action](https://github.com/actions/configure-pages)
- [Official upload-pages-artifact action](https://github.com/actions/upload-pages-artifact)
- [Official deploy-pages action](https://github.com/actions/deploy-pages)
