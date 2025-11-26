// Minimal Mapbox initializer (no modules)
mapboxgl.accessToken = 'pk.eyJ1Ijoic3VtaXRoa2FudGgwNyIsImEiOiJjbTNoaHRiMjUwYW0yMmpzOGF2bzl6NzhyIn0.ZKv6URC1WfYRAA91qfp5NA';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [77.0716, 10.8874],
  zoom: 13
});

// simple marker
const el = document.createElement('div');
el.style.width = '40px';
el.style.height = '40px';
el.style.backgroundImage = "url('https://img.icons8.com/ios/452/bus.png')";
el.style.backgroundSize = 'contain';
el.style.backgroundRepeat = 'no-repeat';

const marker = new mapboxgl.Marker({ element: el }).setLngLat([77.0716, 10.8874]).addTo(map);
