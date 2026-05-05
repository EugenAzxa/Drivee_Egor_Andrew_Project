DRIVEE — BACKUP SNAPSHOT
========================

Snapshot date: 2026-05-05

This folder is a safety copy of the app as it stood right before the major v2
design redesign + landing-page overhaul. If anything in the live app breaks,
or you want to revert to the receipt-style original landing + previous app
visuals, you can restore from these files.

WHAT IS IN HERE
---------------
- index.html ........ The full app at the moment of this snapshot
                       (already includes ?design=v2 toggle wiring,
                       v2 dashboard, v2 services grid, v2 heroes,
                       v2 free-parking-now card wired to STREETS,
                       map enforcement zones + live officer counter,
                       FAB redesigned as Drivee parking-officer mascot)
- desktop.html ...... The original receipt-style landing page (pre-overhaul)
- manifest.json ..... PWA manifest
- sw.js ............. Service worker
- vercel.json ....... Hosting config
- api/claude.js ..... Claude proxy
- api/track.js ...... Analytics + Telegram

HOW TO RESTORE
--------------
If a future change to /index.html or /desktop.html breaks the live site
and you want to roll back to this snapshot:

1. Open the file you want to restore in this folder
2. Copy its contents
3. Paste into the file at the project root (overwriting current contents)
4. git add the restored files
5. git commit -m "Restore from backup-original-design snapshot"
6. git push (will deploy to drivee.ca via Vercel)

You can also just copy the entire folder back to root:
    cp -r backup-original-design/* .
    rm -rf backup-original-design  (only if you're sure)

NOTES
-----
- The ?design=v2 query param toggle is already in this snapshot.
  Visiting drivee.ca normally still shows the original look. v2 only
  appears when explicitly requested via the URL.
- This folder itself is NOT served at any public URL — Vercel builds
  from the root. The backup is just files sitting in the repo.
- Do NOT delete this folder unless you have a newer backup or are
  confident the live app is stable.
