import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

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
const db = getFirestore(app);

function sanitizeKey(v){
  return v.trim().toUpperCase().replace(/\s+/g,'_').replace(/[.#$\[\]]/g,'_');
}

const input = document.getElementById('vehicleNo');
const btn = document.getElementById('loginBtn');
const status = document.getElementById('status');

btn.addEventListener('click', async () => {
  status.textContent = '';
  const raw = input.value || '';
  if (!raw.trim()) { status.textContent = 'Please enter a vehicle number.'; return; }
  const key = sanitizeKey(raw);
  status.textContent = 'Checking vehicle...';
  try {
    const ref = doc(db, 'vehicles', key);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      status.textContent = 'Vehicle not found. Ask administrator to add the vehicle.';
      return;
    }
    // save session
    localStorage.setItem('driverVehicle', key);
    status.textContent = 'Verified. Redirecting to driver transmit page...';
    setTimeout(() => {
      window.location.href = `transmit.html?vehicle=${encodeURIComponent(key)}`;
    }, 500);
  } catch (err) {
    console.error('Driver login error', err);
    status.textContent = 'Error checking vehicle (see console).';
  }
});
