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

const driverIdInput = document.getElementById('driverId');
const vehicleInput = document.getElementById('vehicleNo');
const btn = document.getElementById('loginBtn');
const status = document.getElementById('status');

btn.addEventListener('click', async () => {
  status.textContent = '';
  const driverId = (driverIdInput.value || '').trim();
  const vehicleRaw = vehicleInput.value || '';
  
  if (!driverId) { 
    status.textContent = 'Please enter your driver ID.'; 
    return; 
  }
  if (!vehicleRaw.trim()) { 
    status.textContent = 'Please enter a vehicle ID.'; 
    return; 
  }
  
  const vehicleKey = sanitizeKey(vehicleRaw);
  status.textContent = 'Validating driver and vehicle...';
  
  try {
    const ref = doc(db, 'vehicles', vehicleKey);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      status.textContent = 'Vehicle not found. Please check the vehicle ID.';
      return;
    }
    
    const vehicleData = snap.data();
    
    // Validate that the driver ID matches the assigned driver for this vehicle
    if (!vehicleData.driverId) {
      status.textContent = 'This vehicle has no driver assigned. Contact the administrator.';
      return;
    }
    
    if (vehicleData.driverId !== driverId) {
      status.textContent = 'Driver ID does not match the assigned driver for this vehicle.';
      return;
    }
    
    // Both driver ID and vehicle ID match - save session
    localStorage.setItem('driverVehicle', vehicleKey);
    localStorage.setItem('driverId', driverId);
    status.textContent = 'Login successful! Redirecting to driver transmit page...';
    setTimeout(() => {
      window.location.href = `transmit.html?vehicle=${encodeURIComponent(vehicleKey)}`;
    }, 500);
  } catch (err) {
    console.error('Driver login error', err);
    status.textContent = 'Error during login (see console).';
  }
});
