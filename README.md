# logistics.tracker.io

Simple client-side vehicle tracking application using Firebase Realtime Database and Mapbox.

Overview
- Users: login via Firebase Auth and view a vehicle's live location on a Mapbox map (`tracking.html`).
- Drivers: send live GPS location from the browser (`transmit.html`).
- Admins: manage allowed users (`admin.html`).

Quick start
1. Host these files on any static host (or locally with a simple HTTP server).
2. Create a Firebase project and enable **Authentication** and **Realtime Database**.
3. Update the Firebase config objects in the JS files (`index.js`, `tracking.js`, `transmit.js`, `admin.js`) with your project's values.
4. Obtain a Mapbox access token and replace the token in `tracking.js`.
5. Secure your Realtime Database with rules (see `firebase.rules` included).

Notes & recommendations
- Database paths have been standardized so transmitters write to `vehicles/<VEHICLE_KEY>` and the tracker reads from the same path.
- Vehicle keys are normalized (trim -> uppercase -> spaces and invalid chars replaced with `_`) before being used as RTDB keys.
- Add proper RTDB rules and admin validation (custom claims or server-side checks) before production use.

Files changed in this repo
- `tracking.js`: added key sanitization and uses `vehicles/<key>` path.
- `transmit.js`: added key sanitization and writes to `vehicles/<key>`.
- `firebase.rules`: example Realtime Database rules (see file).

Security reminder
- Client-side Firebase config is public by design — enforce security with RTDB rules and server-side checks.

If you want, I can:
- generate a minimal `firebase.json` for hosting and deployment steps,
- add a script to throttle driver updates, or
- add stricter RTDB rules with custom claim examples.
