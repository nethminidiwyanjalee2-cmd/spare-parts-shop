# Spare Parts Shop Manager — Next.js + Firebase (offline-capable)

Same features as the Python version (dashboard, billing with barcode scanning,
inventory + printable barcode labels, sales history, reports), now running on
**Next.js** with **Firebase** (Authentication + Cloud Firestore) and working
**offline** as an installable app.

## 1. Create the Firebase project (one time, ~10 minutes)

1. Go to <https://console.firebase.google.com> > **Add project**.
2. **Build > Firestore Database > Create database** — choose *Production mode* and a region close to you.
3. **Build > Authentication > Get started > Email/Password > Enable**.
4. **Authentication > Users > Add user** — create the login (email + password) for the shop owner. Add one per staff member if you like.
5. **Project settings (gear icon) > Your apps > Web (`</>`)** — register an app and copy the config values.
6. **Firestore Database > Rules** — paste the contents of `firestore.rules` and **Publish**.
   (Do not skip this. Without rules, your data is either locked or open to everyone.)

## 2. Run it

```bash
npm install
cp .env.local.example .env.local     # then paste your Firebase values into .env.local
npm run dev                          # http://localhost:3000  (development; no offline mode)
```

For real use (and offline mode) run the production build:

```bash
npm run build
npm start                            # http://localhost:3000
```

## 3. Put it online (recommended) — Vercel, free

1. Push this folder to a GitHub repository.
2. On <https://vercel.com> choose **Add New > Project**, import the repo.
3. Add the four `NEXT_PUBLIC_FIREBASE_*` values under **Environment Variables**, then **Deploy**.

You get an https address that works from any phone, tablet or PC. (Offline mode needs https, or `localhost`.)

## 4. Using it offline

1. **Open the site once while online, signed in.** The app downloads itself and your item list to that device.
2. Optional but best: install it. Chrome/Edge: ⋮ menu > **Install app** (phone: **Add to Home screen**).
3. After that, with no internet you can: open the app, scan/search items, make sales, add items, adjust stock.
   An amber banner tells you you're offline. Everything syncs automatically when the connection returns.

What to know:

* **First login on a device needs internet.** After that it stays signed in.
* **Don't clear browser data / uninstall the app while offline sales are waiting to sync** — they live in that browser until uploaded.
* **Stock is merged, not locked.** If two devices both sell the last unit while offline, stock can go to −1 after syncing. The dashboard flags it as low stock; fix it with the Stock button.
* **Invoice numbers** look like `INV-20261016-143205-K7` (date, time, device code) so devices never clash.
* **Auto barcodes** (`SP00001…`) are picked from the highest one the device knows about. If you add new items on two devices while *both* are offline, type your own barcodes or add items while online.
* Sales History and Reports show what that device has downloaded (last 45 days are kept fresh automatically). Older invoices need a connection to load.
* Changing your password needs internet.

## 5. Moving your existing data from the Python app (optional)

```bash
python scripts/export_sqlite.py /path/to/old/shop.db        # creates scripts/data.json
npm install --no-save firebase-admin
# Firebase Console > Project settings > Service accounts > Generate new private key
# save it as ./serviceAccount.json in this folder (it is git-ignored — never share it)
node scripts/import-to-firestore.mjs
```
Then create your login in Authentication (step 1.4) — passwords are not migrated.

## Project map

| Path | What it is |
|---|---|
| `app/(app)/…` | The signed-in pages: dashboard, billing, inventory, sales, reports, change-password |
| `app/login` | Login page |
| `lib/actions.js` | All writes (create item, adjust stock, **complete sale**) |
| `lib/data.jsx` | Live Firestore listeners (items, sales) |
| `lib/firebase.js` | Firebase setup, incl. offline cache |
| `public/sw.js` | Service worker that makes the app itself open offline |
| `firestore.rules` | Security rules — only signed-in users; invoices can't be edited/deleted |

## Cost

Firebase's free Spark plan (about 50,000 reads / 20,000 writes per day) is plenty for one shop.
