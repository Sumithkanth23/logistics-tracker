Backfill RTDB /vehicles -> users/{uid}/vehicles mappings
=====================================================

Purpose
-------
This script reads the Realtime Database node `/vehicles` and writes a boolean mapping into the Realtime Database at `users/{ownerUid}/vehicles/{vehicleId} = true` for each vehicle that has an identifiable owner field. This is useful when RTDB rules enforce owner-based reads.

Requirements
------------
- Node.js 14+ installed
- A Firebase service account JSON file with appropriate Realtime Database permissions
- The RTDB URL for your Firebase project (something like `https://<PROJECT_ID>.firebaseio.com`)

Install
-------
Open PowerShell in this folder and run:

```powershell
cd scripts
npm install
```

Run
---
Replace the placeholders with your actual service account file path and database URL.

PowerShell example:

```powershell
cd .\scripts
node backfill_rtdb_vehicles_to_users.js --serviceAccount ..\path\to\serviceAccount.json --databaseURL https://your-project-id.firebaseio.com
```

Or using environment variables:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = '..\path\to\serviceAccount.json'
$env:FIREBASE_DATABASE_URL = 'https://your-project-id.firebaseio.com'
node backfill_rtdb_vehicles_to_users.js
```

Notes
-----
- The script attempts to detect common owner fields in each RTDB vehicle record: `owner`, `ownerUid`, `uid`, `userId`, or `createdBy.uid`.
- Vehicles with no detectable owner will be skipped and logged.
- This script is idempotent for mapping writes (it simply sets `true`).

If your data stores owner information under a different field, tell me the exact field name and I will update the script.
