import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getDatabase, ref as rtdbRef, set as rtdbSet } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

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
const database = getFirestore(app);
const auth = getAuth(app);
const rtdb = getDatabase(app);

let intervalId = null;
let currentVehicleKey = null;

function sanitizeVehicleKey(vehicleNo) {
  if (!vehicleNo) return '';
  return vehicleNo
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[.#$\[\]]/g, '_');
}

function getSelectedVehicleNo() {
  const input = document.getElementById('vehicleInput');
  if (input && input.value) return input.value.trim();
  // check localStorage for driverVehicle
  const stored = localStorage.getItem('driverVehicle');
  return stored || '';
}

// Authentication disabled for open access
console.log('Driver transmit page loaded - authentication not required');

// Driver logout handler
const driverLogoutBtn = document.getElementById('driverLogoutBtn');
if (driverLogoutBtn) {
  driverLogoutBtn.addEventListener('click', async () => {
    // Stop any active location sending
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    // Clear session data
    localStorage.removeItem('driverVehicle');
    localStorage.removeItem('driverId');
    // Redirect to home
    window.location.href = '../index.html';
  });
}

// If a vehicle is provided in the URL or localStorage, prefill input and check existence
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('vehicle') || localStorage.getItem('driverVehicle');
  if (v) {
    const input = document.getElementById('vehicleInput');
    if (input) input.value = v.replace(/_/g, ' ');
    // verify existence
    const key = sanitizeVehicleKey(v);
    try {
      const snap = await getDoc(doc(database, 'vehicles', key));
      const status = document.getElementById('statusMessage');
      if (!snap.exists()) {
        status.textContent = 'Vehicle not found in database.';
        status.style.color = 'red';
        // ensure controls disabled
        const startBtn = document.getElementById('startBtn');
        const sendOnceBtn = document.getElementById('sendOnceBtn');
        if (startBtn) startBtn.disabled = true;
        if (sendOnceBtn) sendOnceBtn.disabled = true;
      } else {
        status.textContent = 'Vehicle verified. Ready to send location.';
        status.style.color = 'green';
        // lock input and show vehicle display
        handleVerifiedVehicle(key, snap.data());
      }
    } catch (err) {
      console.error('vehicle verify failed', err);
    }
  }
});

// Verify vehicle when input loses focus or on Enter
const vehicleInputEl = document.getElementById('vehicleInput');
if (vehicleInputEl) {
  vehicleInputEl.addEventListener('blur', () => { triggerVerifyVehicle(); });
  vehicleInputEl.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); triggerVerifyVehicle(); } });
}

async function triggerVerifyVehicle() {
  const v = getSelectedVehicleNo();
  const status = document.getElementById('statusMessage');
  if (!v) return;
  const key = sanitizeVehicleKey(v);
  try {
    const snap = await getDoc(doc(database, 'vehicles', key));
    if (!snap.exists()) {
      if (status) { status.textContent = 'Vehicle not found in database.'; status.style.color = 'red'; }
      // disable send controls
      const startBtn = document.getElementById('startBtn');
      const sendOnceBtn = document.getElementById('sendOnceBtn');
      if (startBtn) startBtn.disabled = true;
      if (sendOnceBtn) sendOnceBtn.disabled = true;
      return false;
    }
    if (status) { status.textContent = 'Vehicle verified. Ready to send location.'; status.style.color = 'green'; }
    handleVerifiedVehicle(key, snap.data());
    return true;
  } catch (err) {
    console.error('vehicle verify failed', err);
    if (status) { status.textContent = 'Verification failed.'; status.style.color = 'red'; }
    return false;
  }
}

function handleVerifiedVehicle(key, data) {
  // store and lock
  localStorage.setItem('driverVehicle', key);
  const input = document.getElementById('vehicleInput');
  if (input) { input.value = (data && data.label) ? data.label : key.replace(/_/g,' '); input.readOnly = true; }
  const startBtn = document.getElementById('startBtn');
  const sendOnceBtn = document.getElementById('sendOnceBtn');
  if (startBtn) startBtn.disabled = false;
  if (sendOnceBtn) sendOnceBtn.disabled = false;
  // show vehicle info and change button
  const vi = document.getElementById('vehicleInfo');
  const vd = document.getElementById('vehicleDisplay');
  const changeBtn = document.getElementById('changeVehicleBtn');
  if (vd) vd.textContent = key;
  if (vi) vi.style.display = 'block';
  if (changeBtn) {
    changeBtn.style.display = 'inline-block';
    changeBtn.onclick = () => {
      localStorage.removeItem('driverVehicle');
      if (input) { input.readOnly = false; input.value = ''; input.focus(); }
      if (vi) vi.style.display = 'none';
      if (startBtn) startBtn.disabled = true;
      if (sendOnceBtn) sendOnceBtn.disabled = true;
      const status = document.getElementById('statusMessage'); if (status) { status.textContent = ''; }
    };
  }
}

window.sendLocationOnce = function () {
  const vehicleNo = getSelectedVehicleNo();
  const status = document.getElementById('statusMessage');
  if (!vehicleNo) { alert('Please enter/select a vehicle.'); return; }
  if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
  const formattedKey = sanitizeVehicleKey(vehicleNo);
  navigator.geolocation.getCurrentPosition((position) => {
      const asyncHandler = async (position) => {
      const { latitude, longitude } = position.coords;
      const docRef = doc(database, 'vehicles', formattedKey);
      try {
        await setDoc(docRef, { latitude, longitude, location: { latitude, longitude }, timestamp: serverTimestamp() }, { merge: true });
        // also write to RTDB for live readers
        try {
          await rtdbSet(rtdbRef(rtdb, `vehicles/${formattedKey}`), {
            latitude,
            longitude,
            location: { latitude, longitude },
            timestamp: Date.now()
          });
        } catch (rtdbErr) {
          console.warn('RTDB write failed (one-time)', rtdbErr);
        }
        status.textContent = 'Location Transmitted'; status.style.color = 'green';
      } catch (err) {
        console.error('Error updating location', err); status.textContent = '❌ ' + (err && err.message || 'Error'); status.style.color = 'red';
      }
    };
    asyncHandler(position);
  }, (err) => { console.error('Geolocation error', err); status.textContent = '❌ Failed to fetch location'; status.style.color = 'red'; }, { enableHighAccuracy: true });
};

window.startSendingLocation = function () {
  const vehicleNo = getSelectedVehicleNo();
  const status = document.getElementById('statusMessage');
  if (!vehicleNo) { alert('Please enter/select a vehicle.'); return; }
  if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
  // confirmation
  if (!confirm('Start sending live location every 3 seconds for this vehicle?')) return;
  currentVehicleKey = sanitizeVehicleKey(vehicleNo);
  clearInterval(intervalId);
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'inline-block';
  // show animation
  const anim = document.getElementById('sendAnimation'); if (anim) anim.style.display = 'block';
  intervalId = setInterval(() => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const docRef = doc(database, 'vehicles', currentVehicleKey);
      try {
        await setDoc(docRef, { latitude, longitude, location: { latitude, longitude }, timestamp: serverTimestamp() }, { merge: true });
        // also update RTDB for live readers
        try {
          await rtdbSet(rtdbRef(rtdb, `vehicles/${currentVehicleKey}`), {
            latitude,
            longitude,
            location: { latitude, longitude },
            timestamp: Date.now()
          });
        } catch (rtdbErr) {
          console.warn('RTDB write failed (interval)', rtdbErr);
        }
        status.textContent = 'Started live location transmission...'; status.style.color = 'green';
      } catch (err) {
        console.error('Error updating location', err); status.textContent = '❌ ' + (err && err.message || 'Error'); status.style.color = 'red';
      }
    }, (err) => { console.error('Geolocation error', err); status.textContent = '❌ Failed to fetch location'; status.style.color = 'red'; }, { enableHighAccuracy: true });
  }, 3000);
};

window.stopSendingLocation = function () {
  if (!confirm('Stop sending live location?')) return;
  clearInterval(intervalId);
  intervalId = null;
  currentVehicleKey = null;
  const statusEl = document.getElementById('statusMessage'); if (statusEl) { statusEl.textContent = 'Stopped sending location.'; }
  const startBtn = document.getElementById('startBtn'); const stopBtn = document.getElementById('stopBtn');
  if (startBtn) startBtn.style.display = 'inline-block';
  if (stopBtn) stopBtn.style.display = 'none';
  // hide animation
  const anim = document.getElementById('sendAnimation'); if (anim) anim.style.display = 'none';
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sendOnceBtn').addEventListener('click', window.sendLocationOnce);
  document.getElementById('stopBtn').addEventListener('click', window.stopSendingLocation);
  // If driverVehicle stored in localStorage, prefill input
  const stored = localStorage.getItem('driverVehicle');
  if (stored) {
    const input = document.getElementById('vehicleInput');
    if (input) input.value = stored.replace(/_/g, ' ');
  }
});

// Add skeleton toggle for driver page while verifying vehicle
async function verifyAndShowSkeleton(key) {
  const container = document.querySelector('.form-wrap');
  if (container) container.classList.add('skeleton-loading');
  try {
    const snap = await getDoc(doc(database, 'vehicles', key));
    return snap;
  } finally {
    if (container) container.classList.remove('skeleton-loading');
  }
}
