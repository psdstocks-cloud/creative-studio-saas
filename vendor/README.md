# Vendored Playwright stubs

Cloudflare Pages runs `npm ci`, which requires every dependency listed in
`package.json` to have a matching entry in `package-lock.json`. The real
Playwright packages are large and require native downloads that are not needed
for this project, so we provide lightweight stub packages that satisfy the
install step without shipping the upstream binaries.

If you need the real Playwright tooling locally, remove the local `file:`
dependencies from `package.json` and run `npm install @playwright/test
playwright`. Do not commit those changes.
