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
const userAvatar = document.getElementById('userAvatar');
const userDropdown = document.getElementById('userDropdown');
const totalVehiclesEl = document.getElementById('totalVehicles');
const activeVehiclesEl = document.getElementById('activeVehicles');
const lastUpdatedEl = document.getElementById('lastUpdated');

let currentUid = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }
  currentUid = user.uid;
  authInfo.textContent = `Signed in as: ${user.email || user.uid} ${user.isAnonymous ? '(anonymous)' : ''}`;
  // show user id in dropdown (preserve existing logout button so its listener stays attached)
  if (userDropdown) {
    let userInfo = userDropdown.querySelector('.user-info');
    if (!userInfo) {
      userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      userInfo.style.padding = '8px 12px';
      userInfo.style.borderBottom = '1px solid rgba(0,0,0,0.06)';
      userInfo.style.fontSize = '13px';
      userInfo.style.color = '#111';
      userDropdown.insertBefore(userInfo, userDropdown.firstChild);
    }
    userInfo.textContent = user.email ? `User: ${user.email}` : `UserID: ${user.uid}`;

    // style existing logout button in red for emphasis
    const logoutEl = document.getElementById('logoutBtn');
    if (logoutEl) {
      logoutEl.style.color = '#dc2626';
      logoutEl.style.background = 'transparent';
      logoutEl.style.border = 'none';
      logoutEl.style.fontWeight = '700';
      logoutEl.style.width = '100%';
      logoutEl.style.textAlign = 'left';
      logoutEl.style.padding = '10px 12px';
    }
  }

  loadUserVehicles();
});

function renderCardsFromData(dataObj) {
  vehicleCards.innerHTML = '';
  if (!dataObj || Object.keys(dataObj).length === 0) {
    vehicleCards.innerHTML = '<div class="card">No vehicles found. Click New Vehicle to add one.</div>';
    // update summary
    if (totalVehiclesEl) totalVehiclesEl.textContent = '0';
    if (activeVehiclesEl) activeVehiclesEl.textContent = '0';
    if (lastUpdatedEl) lastUpdatedEl.textContent = '-';
    return;
  }
  const filter = (searchInput && searchInput.value || '').trim().toLowerCase();
  // update summary counters
  const keys = Object.keys(dataObj);
  if (totalVehiclesEl) totalVehiclesEl.textContent = String(keys.length);
  let activeCount = 0;
  let latest = 0;
  Object.keys(dataObj).forEach((key) => {
    const v = dataObj[key];
    const label = (v && v.label) ? v.label : key.replace(/_/g, ' ');
    // heuristics for active/updated
    if (v && (v.lastSeen || v.updatedAt || v.lastLocation)) activeCount++;
    if (v && v.updatedAt) {
      const t = Number(v.updatedAt) || Date.parse(v.updatedAt || '');
      if (t && t > latest) latest = t;
    }
    if (filter && !label.toLowerCase().includes(filter)) return;

    const card = document.createElement('div');
    card.className = 'card';
    const h = document.createElement('h4'); h.textContent = label; card.appendChild(h);
    const small = document.createElement('small'); small.textContent = `ID: ${v && v.id ? v.id : key}`; card.appendChild(small);
    // show description if available in vehicle doc
    if (v && v.description) {
      const desc = document.createElement('p');
      desc.className = 'desc';
      desc.textContent = v.description;
      desc.style.margin = '8px 0 0';
      desc.style.color = '#6b7280';
      desc.style.fontSize = '13px';
      card.appendChild(desc);
    }
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
  if (activeVehiclesEl) activeVehiclesEl.textContent = String(activeCount);
  if (lastUpdatedEl) lastUpdatedEl.textContent = latest ? (new Date(latest)).toLocaleString() : '-';
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
    window.location.href = '../index.html';
  }).catch(err => console.error('signOut error', err));
});

// Search filter
if (searchInput) {
  searchInput.addEventListener('input', () => loadUserVehicles());
}

// User avatar dropdown toggle and outside click handler
if (userAvatar && userDropdown) {
  userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', () => { if (userDropdown) userDropdown.style.display = 'none'; });
}
