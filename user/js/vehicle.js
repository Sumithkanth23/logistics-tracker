import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getFirestore, doc, onSnapshot, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';
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
const currentDriverEl = document.getElementById('currentDriver');
const assignDriverBtn = document.getElementById('assignDriverBtn');
const removeDriverBtn = document.getElementById('removeDriverBtn');
const driverStatus = document.getElementById('driverStatus');

let currentUid = null;
let vehicleData = null;

if (!vehicleKey) {
  labelEl.textContent = 'No vehicle selected';
}

onAuthStateChanged(auth, (user) => {
  currentUid = user ? user.uid : null;
  // no strict auth requirement; show metadata if available
  if (vehicleKey) {
    const metaRef = doc(db, 'vehicles', vehicleKey);
    onSnapshot(metaRef, (snap) => {
      const data = snap.data();
      vehicleData = data;
      if (data) {
        labelEl.textContent = data.label || vehicleKey.replace(/_/g, ' ');
        metaEl.textContent = data.desc ? data.desc : `Owned by: ${data.owner || 'unknown'}`;
        // update driver display
        if (data.driverId) {
          currentDriverEl.textContent = `Current driver: ${data.driverId}`;
          if (removeDriverBtn) removeDriverBtn.style.display = 'inline-block';
        } else {
          currentDriverEl.textContent = 'No driver assigned';
          if (removeDriverBtn) removeDriverBtn.style.display = 'none';
        }
      } else {
        labelEl.textContent = vehicleKey.replace(/_/g, ' ');
        metaEl.textContent = 'No meta available';
        currentDriverEl.textContent = 'No driver assigned';
        if (removeDriverBtn) removeDriverBtn.style.display = 'none';
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

// Assign driver handler
if (assignDriverBtn) {
  assignDriverBtn.addEventListener('click', async () => {
    if (!currentUid) {
      driverStatus.textContent = 'You must be signed in to assign a driver.';
      return;
    }
    if (!vehicleKey) {
      driverStatus.textContent = 'No vehicle selected.';
      return;
    }
    // Validate ownership before allowing assignment
    if (vehicleData && vehicleData.owner && vehicleData.owner !== currentUid) {
      driverStatus.textContent = 'You can only assign drivers to vehicles you own.';
      return;
    }
    const currentDriver = vehicleData && vehicleData.driverId ? vehicleData.driverId : '';
    const input = prompt('Enter Driver ID to assign to this vehicle:', currentDriver);
    if (input === null) return; // cancelled
    const trimmed = (input || '').trim();
    if (!trimmed) {
      driverStatus.textContent = 'No driver ID entered.';
      return;
    }
    try {
      assignDriverBtn.disabled = true;
      driverStatus.textContent = 'Assigning driver...';
      // update vehicle doc
      await setDoc(doc(db, 'vehicles', vehicleKey), { driverId: trimmed, driverAssignedAt: Date.now(), owner: currentUid }, { merge: true });
      // update user's vehicle subcollection
      await setDoc(doc(db, 'users', currentUid, 'vehicles', vehicleKey), { driverId: trimmed, updatedAt: Date.now() }, { merge: true });
      
      // Get vehicle label
      const vehicleLabel = vehicleData && vehicleData.label ? vehicleData.label : vehicleKey;
      
      // create driver mapping in user's subcollection
      await setDoc(doc(db, 'users', currentUid, 'drivers', trimmed), { vehicle: vehicleKey, vehicleLabel: vehicleLabel, assignedAt: Date.now() }, { merge: true });
      
      // Write to root-level drivers collection
      await setDoc(doc(db, 'drivers', trimmed), { 
        vehicle: vehicleKey, 
        vehicleLabel: vehicleLabel,
        owner: currentUid, 
        assignedAt: Date.now(),
        updatedAt: Date.now() 
      }, { merge: true });
      driverStatus.textContent = `Driver ${trimmed} assigned successfully!`;
      assignDriverBtn.disabled = false;
      setTimeout(() => { driverStatus.textContent = ''; }, 3000);
    } catch (err) {
      console.error('Assign driver failed', err);
      driverStatus.textContent = `Failed to assign driver: ${err.message || err}`;
      assignDriverBtn.disabled = false;
    }
  });
}

// Remove driver handler
if (removeDriverBtn) {
  removeDriverBtn.addEventListener('click', async () => {
    if (!currentUid) {
      driverStatus.textContent = 'You must be signed in to remove a driver.';
      return;
    }
    if (!vehicleKey) {
      driverStatus.textContent = 'No vehicle selected.';
      return;
    }
    if (!vehicleData || !vehicleData.driverId) {
      driverStatus.textContent = 'No driver to remove.';
      return;
    }
    // Validate ownership before allowing removal
    if (vehicleData && vehicleData.owner && vehicleData.owner !== currentUid) {
      driverStatus.textContent = 'You can only remove drivers from vehicles you own.';
      return;
    }
    const confirmed = confirm(`Remove driver ${vehicleData.driverId} from this vehicle?`);
    if (!confirmed) return;
    try {
      removeDriverBtn.disabled = true;
      driverStatus.textContent = 'Removing driver...';
      const driverIdToRemove = vehicleData.driverId;
      
      // remove driverId from vehicle doc
      await setDoc(doc(db, 'vehicles', vehicleKey), { driverId: null, driverAssignedAt: null }, { merge: true });
      // remove from user's vehicle subcollection
      await setDoc(doc(db, 'users', currentUid, 'vehicles', vehicleKey), { driverId: null, updatedAt: Date.now() }, { merge: true });
      
      // Remove from root-level drivers collection
      try {
        await setDoc(doc(db, 'drivers', driverIdToRemove), { 
          vehicle: null, 
          vehicleLabel: null,
          removedAt: Date.now(),
          updatedAt: Date.now() 
        }, { merge: true });
      } catch (e) {
        console.warn('Failed to update root drivers collection', e);
      }
      driverStatus.textContent = 'Driver removed successfully!';
      removeDriverBtn.disabled = false;
      setTimeout(() => { driverStatus.textContent = ''; }, 3000);
    } catch (err) {
      console.error('Remove driver failed', err);
      driverStatus.textContent = `Failed to remove driver: ${err.message || err}`;
      removeDriverBtn.disabled = false;
    }
  });
}
