import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCaNsjn5XPnr7P6ufN10T1Ej10mNFAcBP4",
  authDomain: "tracking-application-d2060.firebaseapp.com",
  databaseURL: "https://tracking-application-d2060-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tracking-application-d2060",
  storageBucket: "tracking-application-d2060.appspot.com",
  messagingSenderId: "401177639432",
  appId: "1:401177639432:web:1b6f9a914aa4d53efcefbd"
};

// Initialize Fire
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Normalize vehicle keys for RTDB paths
function sanitizeVehicleKey(vehicleNo) {
  if (!vehicleNo) return '';
  return vehicleNo
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[.#$\[\]]/g, '_');
}

// Check auth state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("You are not logged in.");
    window.location.href = "index.html";
  } else {
    console.log("Logged in as:", user.email);
  }
});

// Mapbox token
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VtaXRoa2FudGgwNyIsImEiOiJjbTNoaHRiMjUwYW0yMmpzOGF2bzl6NzhyIn0.ZKv6URC1WfYRAA91qfp5NA';

// Initialize map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [77.0716, 10.8874],
  zoom: 13
});

// Add directions control
const directions = new MapboxDirections({
  accessToken: mapboxgl.accessToken,
  unit: 'metric',
  profile: 'mapbox/driving',
  controls: { instructions: false }
});
map.addControl(directions, 'top-left');

// Custom marker
const marker = new mapboxgl.Marker({
  element: createBusMarker()
}).setLngLat([0, 0]).addTo(map);

// Create bus icon
function createBusMarker() {
  const el = document.createElement('div');
  el.style.width = '40px';
  el.style.height = '40px';
  el.style.backgroundImage = "url('https://img.icons8.com/ios/452/bus.png')";
  el.style.backgroundSize = 'contain';
  el.style.backgroundRepeat = 'no-repeat';
  return el;
}

// Track button click
document.getElementById("fetchLocationButton").addEventListener("click", () => {
  const vehicleNo = document.getElementById("vehicleNumber").value.trim();
  if (!vehicleNo) {
    alert("Please enter a vehicle number.");
    return;
  }

  const vehicleKey = sanitizeVehicleKey(vehicleNo);
  const path = `vehicles/${vehicleKey}`;
  const refPath = ref(database, path);

  onValue(refPath, (snapshot) => {
    const data = snapshot.val();
    if (data && data.latitude && data.longitude) {
      const { latitude, longitude } = data;
      marker.setLngLat([longitude, latitude]);
      map.flyTo({ center: [longitude, latitude], zoom: 14 });

      directions.setOrigin([longitude, latitude]);
      directions.setDestination([77.07614, 11.04151]); // College

      getETA([longitude, latitude], [77.07614, 11.04151]);
      document.getElementById("message").textContent = "";
    } else {
      document.getElementById("message").textContent = "Location not available for this vehicle.";
    }
  });
});

// Get ETA using Mapbox API
function getETA(origin, destination) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin[0]},${origin[1]};${destination[0]},${destination[1]}?access_token=${mapboxgl.accessToken}&geometries=geojson`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.routes && data.routes.length > 0) {
        const minutes = Math.round(data.routes[0].duration / 60);
        document.getElementById("eta").textContent = `ETA: ${minutes} min`;
      } else {
        document.getElementById("eta").textContent = "ETA unavailable";
      }
    })
    .catch(err => {
      console.error("ETA error:", err);
      document.getElementById("eta").textContent = "ETA unavailable";
    });
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  const auth = getAuth();

  // Sign out from Firebase
  signOut(auth)
    .then(() => {
      // Clear local/session storage and cookies
      localStorage.clear();
      sessionStorage.clear();

      // Clear all cookies
      document.cookie.split(";").forEach(cookie => {
        document.cookie = cookie
          .replace(/^ +/, "")
          .replace(/=.*/, `=;expires=${new Date(0).toUTCString()};path=/`);
      });

      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Logout error:", error.message);
    });
});

