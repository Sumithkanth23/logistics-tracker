import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

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
  // remove loading state
  if (vehicleCards) vehicleCards.classList.remove('skeleton-loading');
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
    // show description (preferred) or fallback to ID
    const small = document.createElement('small');
    small.textContent = v && (v.description || v.desc) ? (v.description || v.desc) : `ID: ${v && v.id ? v.id : key}`;
    small.style.display = 'block';
    small.style.marginTop = '6px';
    small.style.color = '#6b7280';
    small.style.fontSize = '13px';
    card.appendChild(small);
    // show assigned driver if present
    if (v && v.driverId) {
      const drv = document.createElement('div'); drv.style.marginTop = '8px'; drv.style.fontSize = '13px'; drv.style.color = '#374151'; drv.textContent = `Driver: ${v.driverId}`; card.appendChild(drv);
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
    // Assign driver button
    const assignBtn = document.createElement('button'); assignBtn.textContent = 'Assign Driver'; assignBtn.className = 'secondary';
    assignBtn.addEventListener('click', async () => {
      try {
        const input = prompt('Enter Driver ID to assign to this vehicle (leave blank to cancel):', (v && v.driverId) ? v.driverId : '');
        if (input === null) return; // cancelled
        const trimmed = (input || '').trim();
        if (!trimmed) { alert('No driver ID entered; assignment cancelled.'); return; }
        await assignDriver(key, trimmed);
        alert(`Driver ${trimmed} assigned to ${key}`);
      } catch (err) {
        console.error('Assign driver failed', err);
        alert('Failed to assign driver. See console for details.');
      }
    });
    actions.appendChild(assignBtn);
    card.appendChild(actions);

    card.classList.add('fade-in');
    vehicleCards.appendChild(card);
  });
  if (activeVehiclesEl) activeVehiclesEl.textContent = String(activeCount);
  if (lastUpdatedEl) lastUpdatedEl.textContent = latest ? (new Date(latest)).toLocaleString() : '-';
}

function loadUserVehicles() {
  if (!currentUid) return;
  const userVehiclesCol = collection(db, 'users', currentUid, 'vehicles');
  // show skeleton while initial data loads
  if (vehicleCards) vehicleCards.classList.add('skeleton-loading');
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

// Assign driver helper: updates vehicle document and creates a user->driver mapping
async function assignDriver(vehicleKey, driverId) {
  if (!currentUid) throw new Error('Not authenticated');
  const vKey = vehicleKey;
  // Validate ownership before allowing assignment
  const vehicleRef = doc(db, 'vehicles', vKey);
  const vehicleSnap = await getDoc(vehicleRef);
  if (vehicleSnap.exists()) {
    const vehicleData = vehicleSnap.data();
    if (vehicleData.owner && vehicleData.owner !== currentUid) {
      throw new Error('You can only assign drivers to vehicles you own.');
    }
  }
  // update vehicles/{key}
  await setDoc(doc(db, 'vehicles', vKey), { driverId: driverId, driverAssignedAt: Date.now(), owner: currentUid }, { merge: true });
  
  // Get vehicle label for driver record
  const vSnap = await getDoc(vehicleRef);
  const vehicleLabel = vSnap.exists() ? (vSnap.data().label || vKey) : vKey;
  
  // update users/{uid}/drivers/{driverId}
  try {
    await setDoc(doc(db, 'users', currentUid, 'drivers', driverId), { vehicle: vKey, vehicleLabel: vehicleLabel, assignedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.warn('Failed to write users/{uid}/drivers mapping', e);
  }
  
  // Write to root-level drivers collection
  try {
    await setDoc(doc(db, 'drivers', driverId), { 
      vehicle: vKey, 
      vehicleLabel: vehicleLabel,
      owner: currentUid, 
      assignedAt: Date.now(),
      updatedAt: Date.now() 
    }, { merge: true });
  } catch (e) {
    console.warn('Failed to write root drivers collection', e);
  }
  // reflect assignment in user's vehicle subcollection as well
  try {
    await setDoc(doc(db, 'users', currentUid, 'vehicles', vKey), { driverId: driverId, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.warn('Failed to update users/{uid}/vehicles entry with driverId', e);
  }
}
