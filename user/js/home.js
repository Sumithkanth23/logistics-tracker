import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, doc, setDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

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

function sanitizeVehicleKey(vehicleNo) {
  if (!vehicleNo) return '';
  return vehicleNo.trim().toUpperCase().replace(/\s+/g, '_').replace(/[.#$\[\]]/g, '_');
}

const authInfo = document.getElementById('authInfo');
const vehicleCards = document.getElementById('vehicleCards');
const refreshBtn = document.getElementById('refreshBtn');
const createVehicleBtn = document.getElementById('createVehicleBtn');
const openTrackerBtn = document.getElementById('openTrackerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchVehicle');

let currentUid = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }
  currentUid = user.uid;
  authInfo.textContent = `Signed in as: ${user.email || user.uid} ${user.isAnonymous ? '(anonymous)' : ''}`;
  loadUserVehicles();
});

function renderCardsFromData(dataObj) {
  vehicleCards.innerHTML = '';
  if (!dataObj || Object.keys(dataObj).length === 0) {
    vehicleCards.innerHTML = '<div class="card">No vehicles found. Click New Vehicle to add one.</div>';
    return;
  }
  const filter = (searchInput && searchInput.value || '').trim().toLowerCase();
  Object.keys(dataObj).forEach((key) => {
    const v = dataObj[key];
    const label = (v && v.label) ? v.label : key.replace(/_/g, ' ');
    if (filter && !label.toLowerCase().includes(filter)) return;

    const card = document.createElement('div');
    card.className = 'card';
    const h = document.createElement('h4'); h.textContent = label; card.appendChild(h);
    const small = document.createElement('small'); small.textContent = `ID: ${key}`; card.appendChild(small);
    const br = document.createElement('div'); br.style.marginTop = '10px'; card.appendChild(br);

    const actions = document.createElement('div'); actions.className = 'actions';
    const trackBtn = document.createElement('button'); trackBtn.textContent = 'Track';
    trackBtn.addEventListener('click', () => {
      // redirect to root tracking page with vehicle param
      window.location.href = `tracking.html?vehicle=${encodeURIComponent(key)}`;
    });
    actions.appendChild(trackBtn);

    const detailsBtn = document.createElement('button'); detailsBtn.textContent = 'Details';
    detailsBtn.className = 'secondary';
    detailsBtn.addEventListener('click', () => {
      window.location.href = `vehicle.html?vehicle=${encodeURIComponent(key)}`;
    });
    actions.appendChild(detailsBtn);
    card.appendChild(actions);

    vehicleCards.appendChild(card);
  });
}

function loadUserVehicles() {
  if (!currentUid) return;
  const userVehiclesCol = collection(db, 'users', currentUid, 'vehicles');
  onSnapshot(userVehiclesCol, (snap) => {
    const data = {};
    snap.forEach(docSnap => { data[docSnap.id] = docSnap.data(); });
    renderCardsFromData(data);
  }, (err) => {
    console.error('userVehicles read error:', err && err.code, err && err.message);
    vehicleCards.innerHTML = '<div class="card">Error loading vehicles (see console)</div>';
  });
}

refreshBtn.addEventListener('click', () => loadUserVehicles());
createVehicleBtn.addEventListener('click', () => { window.location.href = 'create_vehicle.html'; });
openTrackerBtn.addEventListener('click', () => { window.location.href = 'tracking.html'; });

logoutBtn.addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = './index.html';
  }).catch(err => console.error('signOut error', err));
});

// Search filter
if (searchInput) {
  searchInput.addEventListener('input', () => loadUserVehicles());
}
