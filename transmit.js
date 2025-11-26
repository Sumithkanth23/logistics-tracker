import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

let intervalId = null;

window.startSendingLocation = function () {
  const vehicleNo = document.getElementById("vehicleNumber").value.trim();
  const status = document.getElementById("statusMessage");

  if (!vehicleNo) {
    alert("Please enter your vehicle number.");
    return;
  }

  const formattedKey = vehicleNo.replace(/\s+/g, "_");

  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser.");
    return;
  }

  // Normalize key and clear any previous interval
  function sanitizeVehicleKey(vehicleNo) {
    if (!vehicleNo) return '';
    return vehicleNo
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[.#$\[\]]/g, '_');
  }

  const formattedKey = sanitizeVehicleKey(vehicleNo);

  // Clear any previous interval
  clearInterval(intervalId);

  // Start fetching location every 3 seconds
  intervalId = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Write to `vehicles/<key>` so the tracker and transmitter use the same path
        const locationRef = ref(database, `vehicles/${formattedKey}`);

        set(locationRef, {
          latitude,
          longitude,
          timestamp: Date.now()
        })
          .then(() => {
            console.log("✅ Location updated");
            status.textContent = "✅ Location sent to Firebase";
            status.style.color = "green";
          })
          .catch((err) => {
            console.error("❌ Error updating location:", err);
            status.textContent = "❌ Error updating location";
            status.style.color = "red";
          });
      },
      (error) => {
        console.error("❌ Geolocation error:", error);
        status.textContent = "❌ Failed to fetch location";
        status.style.color = "red";
      },
      { enableHighAccuracy: true }
    );
  }, 3000); // Every 3 seconds
};
