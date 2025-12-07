import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getDatabase, ref, onValue, get } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getFirestore, collection, getDocs, doc as fsDoc, getDoc, query as fsQuery, where as fsWhere } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js';

// Mapbox token
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VtaXRoa2FudGgwNyIsImEiOiJjbTNoaHRiMjUwYW0yMmpzOGF2bzl6NzhyIn0.ZKv6URC1WfYRAA91qfp5NA';

// Initialize map with latest streets style
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [77.0716, 10.8874],
  zoom: 13
});

// Create marker after map is ready. We'll initialize to null and add it on load so
// the marker element is correctly attached to the map lifecycle.
let marker = null;
map.on('load', () => {
  try {
    marker = new mapboxgl.Marker({ element: createBusMarker() }).setLngLat([0,0]).addTo(map);
    // start hidden until a vehicle is selected
    if (marker && marker.getElement) marker.getElement().style.display = 'none';
  } catch (e) { console.warn('Marker init failed', e); }
});

// Firebase config (same as other modules)
const firebaseConfig = {
  apiKey: "AIzaSyCaNsjn5XPnr7P6ufN10T1Ej10mNFAcBP4",
  authDomain: "tracking-application-d2060.firebaseapp.com",
  databaseURL: "https://tracking-application-d2060-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "tracking-application-d2060",
  storageBucket: "tracking-application-d2060.appspot.com",
  messagingSenderId: "401177639432",
};

const app = initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const auth = getAuth(app);
const dbFs = getFirestore(app);

// Logout button handler
// Attach logout handler after DOM is ready so elements exist
window.addEventListener('DOMContentLoaded', () => {
  try {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        try {
          await signOut(auth);
          window.location.href = '../index.html';
        } catch (err) {
          console.error('Sign-out failed', err);
          const msg = document.getElementById('message');
          if (msg) {
            msg.style.display = 'block';
            msg.textContent = 'Sign-out failed. See console for details.';
            setTimeout(() => { msg.style.display = 'none'; }, 5000);
          }
        }
      });
    }
  } catch (e) {
    console.warn('Logout button init error', e);
  }

  // Global error handlers to surface runtime problems in the UI
  window.addEventListener('error', (ev) => {
    try {
      const msg = document.getElementById('message');
      if (msg) {
        msg.style.display = 'block';
        msg.textContent = `Error: ${ev.message || ev.error || ev}`;
      }
    } catch (e) {}
    console.error('Global error', ev.error || ev.message || ev);
  });

  window.addEventListener('unhandledrejection', (ev) => {
    try {
      const msg = document.getElementById('message');
      if (msg) {
        msg.style.display = 'block';
        msg.textContent = `Unhandled promise rejection: ${ev.reason && ev.reason.message ? ev.reason.message : ev.reason}`;
      }
    } catch (e) {}
    console.error('Unhandled rejection', ev.reason);
  });
});

// Helpers
function sanitizeVehicleKey(vehicleNo) {
  if (!vehicleNo) return '';
  return vehicleNo.trim().toUpperCase().replace(/\s+/g, '_').replace(/[.#$\[\]]/g, '_');
}

function extractLatLng(data) {
  if (!data) return null;
  const latCandidates = [data?.location?.latitude, data?.location?.lat, data?.latitude, data?.lat, data?.coords?.latitude, data?.coords?.lat];
  const lngCandidates = [data?.location?.longitude, data?.location?.lng, data?.longitude, data?.lng, data?.coords?.longitude, data?.coords?.lng];
  const lat = latCandidates.find(v => typeof v === 'number');
  const lng = lngCandidates.find(v => typeof v === 'number');
  if (lat !== undefined && lng !== undefined && lat !== null && lng !== null) return { latitude: lat, longitude: lng };
  return null;
}

function createBusMarker() {
  const el = document.createElement('div');
  el.style.width = '44px';
  el.style.height = '44px';
  el.style.backgroundImage = "url('https://img.icons8.com/ios/452/bus.png')";
  el.style.backgroundSize = 'contain';
  el.style.backgroundRepeat = 'no-repeat';
  el.style.transform = 'translate(-22px, -22px)';
  return el;
}

let currentUnsub = null;
let clickMarker = null; // marker for manual pins placed by clicking the map
let currentUserUid = null; // store current user ID for ownership checks

// Require authentication: only signed-in users may view vehicles
onAuthStateChanged(auth, (user) => {
  currentUserUid = user ? user.uid : null;
  if (user) {
    const params = new URLSearchParams(window.location.search);
    const vehicle = params.get('vehicle');
    if (vehicle) {
      watchVehicle(vehicle);
    }
    // load other vehicles owned by this user to display in right sidebar
    loadVehicleList(user.uid);
    // mobile: show sidebar toggle and hide sidebar by default
    try {
      const sidebarToggle = document.getElementById('sidebarToggle');
      const rightSidebar = document.getElementById('rightSidebar');
      if (sidebarToggle && rightSidebar) {
        if (window.innerWidth <= 720) { rightSidebar.style.display = 'none'; sidebarToggle.style.display = 'block'; }
        sidebarToggle.addEventListener('click', () => {
          if (rightSidebar.style.display === 'none' || getComputedStyle(rightSidebar).display === 'none') { rightSidebar.style.display = 'block'; sidebarToggle.textContent = 'Close'; }
          else { rightSidebar.style.display = 'none'; sidebarToggle.textContent = 'Vehicles'; }
        });
      }
    } catch(e) {}
    // allow clicking the map to drop a pin
    try {
      map.on('click', async (e) => {
        const lng = e.lngLat.lng;
        const lat = e.lngLat.lat;
        // create or move clickMarker
        try {
          if (!clickMarker) {
            clickMarker = new mapboxgl.Marker({ color: 'crimson' }).setLngLat([lng, lat]).addTo(map);
          } else {
            clickMarker.setLngLat([lng, lat]);
          }
        } catch (err) {
          console.warn('Could not place click marker', err);
        }
        // center map and show pinned info
        try { map.flyTo({ center: [lng, lat], zoom: 15 }); } catch(e){}
        // reverse geocode and show in selected panel
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&limit=1`;
          const res = await fetch(url);
          const j = await res.json();
          const place = (j && j.features && j.features[0] && j.features[0].place_name) ? j.features[0].place_name : '';
          // reuse renderSelectedInfo to display address and timestamp (it expects a key and data)
          await renderSelectedInfo('PIN_' + Math.round(Date.now()/1000), { label: 'Pinned location', timestamp: Date.now(), location: { latitude: lat, longitude: lng } });
          const addrEl = document.getElementById('selectedAddress'); if (addrEl) addrEl.textContent = place || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        } catch (err) {
          console.warn('Reverse geocode failed for pin', err);
          await renderSelectedInfo('PIN', { label: 'Pinned location', timestamp: Date.now(), location: { latitude: lat, longitude: lng } });
        }
      });
    } catch (err) {
      console.warn('Failed to attach map click handler', err);
    }
  } else {
    // redirect to top-level login/index page
    window.location.href = '../index.html';
  }
});

// Render selected vehicle info (address, timestamp)
async function renderSelectedInfo(key, data) {
  const panel = document.getElementById('selectedInfo');
  const labelEl = document.getElementById('selectedLabel');
  const addrEl = document.getElementById('selectedAddress');
  const metaEl = document.getElementById('selectedMeta');
  if (!panel || !labelEl || !addrEl || !metaEl) return;
  panel.style.display = 'flex';
  labelEl.textContent = (data && data.label) ? data.label : key.replace(/_/g,' ');
  // timestamp
  let tsText = '';
  if (data && data.timestamp) {
    try { tsText = new Date(data.timestamp.seconds ? data.timestamp.seconds*1000 : data.timestamp).toLocaleString(); } catch(e){}
  }
  metaEl.textContent = tsText ? `Last update: ${tsText}` : '';

  // reverse geocode if lat/lng present
  const ll = extractLatLng(data);
  if (ll) {
    // Move marker and center map to this location (useful for Firestore fallback where RTDB live updates are not available)
    try {
      if (marker && typeof marker.setLngLat === 'function') {
        marker.setLngLat([ll.longitude, ll.latitude]);
          // make sure marker is visible
          try { if (marker.getElement) marker.getElement().style.display = 'block'; } catch(e){}
      }
      if (map && typeof map.flyTo === 'function') {
        map.flyTo({ center: [ll.longitude, ll.latitude], zoom: 14 });
      }
    } catch (e) {
      console.warn('Failed to move marker/map for fallback location', e);
    }
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${ll.longitude},${ll.latitude}.json?access_token=${mapboxgl.accessToken}&limit=1`;
      const res = await fetch(url);
      const j = await res.json();
      const place = (j && j.features && j.features[0] && j.features[0].place_name) ? j.features[0].place_name : '';
      addrEl.textContent = place || `${ll.latitude.toFixed(5)}, ${ll.longitude.toFixed(5)}`;
      // attach a popup to the marker with the label/address
      try {
        if (marker) {
          const popupText = place || labelEl.textContent || '';
          const popup = new mapboxgl.Popup({ offset: 25 }).setText(popupText);
          marker.setPopup(popup);
          // ensure marker element visible
          if (marker.getElement) marker.getElement().style.display = 'block';
          // open popup
          try { marker.togglePopup(); } catch(e){}
        }
      } catch(e) { console.warn('Marker popup failed', e); }
    } catch (err) {
      addrEl.textContent = `${ll.latitude.toFixed(5)}, ${ll.longitude.toFixed(5)}`;
    }
  } else {
    addrEl.textContent = '';
  }
}

// Load vehicles list: prefer Firestore query (owner == uid) and fallback to RTDB mapping
async function loadVehicleList(uid) {
  const container = document.getElementById('vehicleCardsSidebar');
  if (!container) return;
  // show skeleton while fetching
  container.classList.add('skeleton-loading');
  container.innerHTML = '<div>Loading your vehicles...</div>';

  // Primary: Firestore query for owner==uid (safer and ensures only owned vehicles)
  try {
    const q = fsQuery(collection(dbFs, 'vehicles'), fsWhere('owner', '==', uid));
    const snap = await getDocs(q);
    container.innerHTML = '';
    if (snap && snap.size) {
      snap.forEach(d => {
        const k = d.id;
        const v = d.data() || {};
        const card = document.createElement('div');
        card.className = 'vehicle-card';
        const title = document.createElement('div'); title.className='title'; title.textContent = (v.label || k.replace(/_/g,' '));
        const sub = document.createElement('div'); sub.className='subtitle'; sub.textContent = (v.description || v.desc || `ID: ${k}`);
        const actions = document.createElement('div'); actions.className='actions';
        const btnTrack = document.createElement('button'); btnTrack.className='btn-mini track'; btnTrack.textContent='Track';
        btnTrack.addEventListener('click', () => { watchVehicle(k); });
        const btnDetails = document.createElement('button'); btnDetails.className='btn-mini details'; btnDetails.textContent='Details';
        btnDetails.addEventListener('click', () => { window.location.href = `vehicle.html?vehicle=${encodeURIComponent(k)}`; });
        actions.appendChild(btnTrack); actions.appendChild(btnDetails);
        card.appendChild(title); card.appendChild(sub); card.appendChild(actions);
        // fade in
        card.classList.add('fade-in');
        container.appendChild(card);
      });
      // remove skeleton state
      container.classList.remove('skeleton-loading');
      return;
    }
  } catch (fsqErr) {
    console.warn('Firestore owner query failed, falling back to RTDB mapping', fsqErr);
  }

  // Fallback: read the user's vehicle mapping in RTDB: users/{uid}/vehicles
  const mappingRef = ref(rtdb, `users/${uid}/vehicles`);
  try {
    const mapSnap = await get(mappingRef);
    container.innerHTML = '';
    if (mapSnap && mapSnap.exists()) {
      const keys = Object.keys(mapSnap.val() || {});
      if (!keys.length) {
        container.innerHTML = '<div>No vehicles mapped to your account.</div>';
        container.classList.remove('skeleton-loading');
        return;
      }
      // For each mapped key, read metadata from RTDB vehicles/{key} or busLocation/{key}
      for (const k of keys) {
        try {
          let v = null;
          const vSnap = await get(ref(rtdb, `vehicles/${k}`));
          if (vSnap && vSnap.exists()) v = vSnap.val();
          else {
            const bSnap = await get(ref(rtdb, `busLocation/${k}`));
            if (bSnap && bSnap.exists()) v = bSnap.val();
          }
          const card = document.createElement('div');
          card.className = 'vehicle-card';
          const title = document.createElement('div'); title.className='title'; title.textContent = (v && v.label) ? v.label : k.replace(/_/g,' ');
          const sub = document.createElement('div'); sub.className='subtitle'; sub.textContent = (v && (v.description || v.desc)) ? (v.description || v.desc) : `ID: ${k}`;
          const actions = document.createElement('div'); actions.className='actions';
          const btnTrack = document.createElement('button'); btnTrack.className='btn-mini track'; btnTrack.textContent='Track';
          btnTrack.addEventListener('click', () => { watchVehicle(k); });
          const btnDetails = document.createElement('button'); btnDetails.className='btn-mini details'; btnDetails.textContent='Details';
          btnDetails.addEventListener('click', () => { window.location.href = `vehicle.html?vehicle=${encodeURIComponent(k)}`; });
          actions.appendChild(btnTrack); actions.appendChild(btnDetails);
          card.appendChild(title); card.appendChild(sub); card.appendChild(actions);
          card.classList.add('fade-in');
          container.appendChild(card);
        } catch (err) {
          console.warn('Failed to read metadata for', k, err);
        }
      }
      container.classList.remove('skeleton-loading');
      return;
    }
    container.innerHTML = '<div>No vehicles found for your account.</div>';
    container.classList.remove('skeleton-loading');
  } catch (err) {
    console.error('users/{uid}/vehicles mapping read error (RTDB):', err && err.code, err && err.message);
    container.innerHTML = `<div>RTDB read error: ${err && err.code || err}</div>`;
    container.classList.remove('skeleton-loading');
  }
}

// Enhance watchVehicle to update selected info and highlight card
async function watchVehicle(vehicleKey) {
  const key = sanitizeVehicleKey(vehicleKey);
  if (!key) return;
  
  // Validate ownership before allowing watch
  if (currentUserUid) {
    try {
      const vehicleDocRef = fsDoc(dbFs, 'vehicles', key);
      const vehicleSnap = await getDoc(vehicleDocRef);
      
      if (vehicleSnap.exists()) {
        const vehicleData = vehicleSnap.data();
        if (vehicleData.owner && vehicleData.owner !== currentUserUid) {
          console.warn('Access denied: You do not own this vehicle');
          const panel = document.getElementById('selectedInfo');
          if (panel) {
            panel.style.display = 'flex';
            document.getElementById('selectedLabel').textContent = 'Access Denied';
            document.getElementById('selectedAddress').textContent = 'You can only view vehicles you own.';
            document.getElementById('selectedMeta').textContent = '';
          }
          return;
        }
      } else {
        // Check if vehicle exists in user's collection
        const userVehicleRef = fsDoc(dbFs, 'users', currentUserUid, 'vehicles', key);
        const userVehicleSnap = await getDoc(userVehicleRef);
        if (!userVehicleSnap.exists()) {
          console.warn('Vehicle not found in your collection');
          const panel = document.getElementById('selectedInfo');
          if (panel) {
            panel.style.display = 'flex';
            document.getElementById('selectedLabel').textContent = 'Not Found';
            document.getElementById('selectedAddress').textContent = 'Vehicle not found in your account.';
            document.getElementById('selectedMeta').textContent = '';
          }
          return;
        }
      }
    } catch (err) {
      console.error('Ownership validation error:', err);
    }
  }
  
  if (typeof currentUnsub === 'function') { try { currentUnsub(); } catch(e){} currentUnsub=null; }
  const path = `vehicles/${key}`;
  const rRef = ref(rtdb, path);
  console.log('Listening for vehicle at', path);
  const listener = onValue(rRef, async (snap) => {
    const data = snap.val();
    if (data) {
      const ll = extractLatLng(data);
      if (ll) {
        marker.setLngLat([ll.longitude, ll.latitude]);
        map.flyTo({ center: [ll.longitude, ll.latitude], zoom: 14 });
        // If on mobile, hide sidebar to maximize map view
        try {
          const rightSidebar = document.getElementById('rightSidebar');
          if (rightSidebar && window.innerWidth <= 720) { rightSidebar.style.display = 'none'; }
        } catch (e) {}
      }
      await renderSelectedInfo(key, data);
    } else {
      // fallback
      const fbPath = `busLocation/${key}`;
      const fbRef = ref(rtdb, fbPath);
      onValue(fbRef, async (snap2) => {
        const d2 = snap2.val();
        if (d2) {
          const ll2 = extractLatLng(d2);
          if (ll2) { marker.setLngLat([ll2.longitude, ll2.latitude]); map.flyTo({ center: [ll2.longitude, ll2.latitude], zoom: 14 }); }
          await renderSelectedInfo(key, d2);
        } else {
          console.warn('No data for', key);
          const panel = document.getElementById('selectedInfo'); if (panel) panel.style.display='none';
        }
      }, (err) => { console.warn('Fallback read error', err); });
    }
  }, (err) => {
    console.error('RTDB read error for', path, err && err.code);
    const container = document.getElementById('vehicleCardsSidebar');
    if (err && (err.code === 'permission-denied' || (err.message && err.message.toLowerCase().includes('permission')))) {
      // Attempt to load vehicle metadata from Firestore for this key
      (async () => {
        try {
          const docRef = fsDoc(dbFs, 'vehicles', key);
          const d = await getDoc(docRef);
          if (d && d.exists()) {
            const v = d.data() || {};
            await renderSelectedInfo(key, v);
            if (container) container.innerHTML = `<div>Showing metadata from Firestore (live location not available due to RTDB permissions).</div>`;
          } else {
            if (container) container.innerHTML = `<div>No vehicle data found in Firestore for ${key}</div>`;
          }
        } catch (fsErr) {
          console.error('Firestore fallback failed for', key, fsErr);
          if (container) container.innerHTML = `<div>Permission error and Firestore fallback failed: ${fsErr && fsErr.message}</div>`;
        }
      })();
    } else {
      if (container) container.innerHTML = `<div>Permission error: ${err && err.code}</div>`;
    }
  });
  currentUnsub = () => { try { listener(); } catch(e){} };
}
