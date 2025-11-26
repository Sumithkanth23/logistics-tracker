import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, doc, onSnapshot, getDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

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
const auth = getAuth(app);

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

const vehicleKey = getQueryParam('vehicle');
const labelEl = document.getElementById('vehicleLabel');
const metaEl = document.getElementById('vehicleMeta');
const trackBtn = document.getElementById('trackBtn');
const backBtn = document.getElementById('backBtn');
const driverLoginBtn = document.getElementById('driverLoginBtn');
const driverStatus = document.getElementById('driverStatus');

if (!vehicleKey) {
  labelEl.textContent = 'No vehicle selected';
}

onAuthStateChanged(auth, (user) => {
  // no strict auth requirement; show metadata if available
  if (vehicleKey) {
    const metaRef = doc(db, 'vehicles', vehicleKey);
    onSnapshot(metaRef, (snap) => {
      const data = snap.data();
      if (data) {
        labelEl.textContent = data.label || vehicleKey.replace(/_/g, ' ');
        metaEl.textContent = data.desc ? data.desc : `Owned by: ${data.owner || 'unknown'}`;
      } else {
        labelEl.textContent = vehicleKey.replace(/_/g, ' ');
        metaEl.textContent = 'No meta available';
      }
    }, (err) => {
      console.error('meta read error', err);
      metaEl.textContent = 'Error reading metadata (see console)';
    });
  }
});

trackBtn.addEventListener('click', () => {
  if (!vehicleKey) return;
  window.location.href = `../user/tracking.html?vehicle=${encodeURIComponent(vehicleKey)}`;
});

backBtn.addEventListener('click', () => { window.location.href = 'home.html'; });

// Driver login button simply redirects to the driver login page with vehicle param
if (driverLoginBtn) {
  driverLoginBtn.addEventListener('click', () => {
    if (!vehicleKey) {
      driverStatus.textContent = 'No vehicle selected.';
      return;
    }
    window.location.href = `../driver/login.html?vehicle=${encodeURIComponent(vehicleKey)}`;
  });
}
