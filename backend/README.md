# SHARE backend

Live Express API for the SHARE prototype. Deploy this folder, not the legacy root `app.js` tree.

See the root [README.md](../README.md) for product overview and [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) for how the API fits together.

```bash
npm install
cp .env.example .env   # then set local values; never commit secrets
npm start
```

Tests (requires local MongoDB or `MONGO_URI_TEST`). `.npmrc` omits devDependencies by default:

```bash
npm install --include=dev
npm test
```

The prototype records financial activity for testing. It does not hold or transfer real money.
