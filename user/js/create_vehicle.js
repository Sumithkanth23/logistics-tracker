import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, doc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getDatabase, ref as rtdbRef, set as rtdbSet } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyCaNsjn5XPnr7P6ufN10T1Ej10mNFAcBP4",
  authDomain: "tracking-application-d2060.firebaseapp.com",
  databaseURL: "https://tracking-application-d2060-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tracking-application-d2060",
  storageBucket: "tracking-application-d2060.appspot.com",
  messagingSenderId: "401177639432",
  appId: "1:401177639432:web:1b6f9a914aa4d53efcefbd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

function sanitizeVehicleKey(vehicleNo) {
  if (!vehicleNo) return '';
  return vehicleNo.trim().toUpperCase().replace(/\s+/g, '_').replace(/[.#$\[\]]/g, '_');
}

let currentUid = null;
onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = '../index.html'; return; }
  currentUid = user.uid;
});

const form = document.getElementById('createVehicleForm');
const cancelBtn = document.getElementById('cancelBtn');
const createBtn = document.getElementById('createBtn');
const statusEl = document.getElementById('formStatus');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = '';
  const number = document.getElementById('vehicleNumber').value.trim();
  const desc = document.getElementById('vehicleDesc').value.trim();
  if (!number) { statusEl.textContent = 'Please enter a vehicle number.'; return; }
  const key = sanitizeVehicleKey(number);

  // determine uid at submit time
  const uid = currentUid || (auth.currentUser ? auth.currentUser.uid : null);

  console.log('Create vehicle submit', { uid, number, key });

  createBtn.disabled = true;
  createBtn.textContent = 'Creating...';

  // write to user's list if authenticated
  if (uid) {
    try {
      await setDoc(doc(db, 'users', uid, 'vehicles', key), { label: number, desc, addedAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('userVehicles write failed', err);
      statusEl.textContent = `Failed to save to your vehicles: ${err.code || err.message || err}`;
      if (err && (err.code === 'permission-denied' || err.message && err.message.toLowerCase().includes('permission'))) {
        statusEl.textContent += ' — Permission denied. Check Firestore rules and authentication.';
      }
      createBtn.disabled = false;
      createBtn.textContent = 'Create Vehicle';
      return;
    }
  }

  // write metadata under vehicles/<key>
  try {
    await setDoc(doc(db, 'vehicles', key), { label: number, desc, owner: uid || null, updatedAt: Date.now() }, { merge: true });
    // Also write a mapping under Realtime Database so RTDB rules (per-user) can permit reads
    if (uid) {
      try {
        await rtdbSet(rtdbRef(rtdb, `users/${uid}/vehicles/${key}`), true);
      } catch (rtErr) {
        console.warn('RTDB mapping write failed', rtErr);
        // non-fatal: continue to vehicle page but show a notice
        statusEl.textContent = (statusEl.textContent ? statusEl.textContent + ' ' : '') + 'Warning: could not write RTDB owner mapping.';
      }
    }
    // navigate to vehicle detail page within user folder
    window.location.href = `vehicle.html?vehicle=${encodeURIComponent(key)}`;
  } catch (err) {
    console.error('vehicle meta write failed', err);
    statusEl.textContent = `Failed to create vehicle: ${err.code || err.message || err}`;
    if (err && (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permission')))) {
      statusEl.textContent += ' — Permission denied. Ensure Firestore rules allow writes for authenticated users.';
    }
    createBtn.disabled = false;
    createBtn.textContent = 'Create Vehicle';
  }
});

cancelBtn.addEventListener('click', () => { window.location.href = 'home.html'; });
