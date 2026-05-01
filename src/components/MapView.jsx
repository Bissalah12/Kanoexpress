// src/components/MapView.jsx
// ─── Leaflet Map (replaces MapPlaceholder simulation) ──────
// Uses OpenStreetMap tiles — free, no API key needed.
// Leaflet is ~40KB gzipped — fine for low-data Android devices.

import { useEffect, useRef } from "react";

// Kano city center
const KANO_CENTER = [12.0022, 8.5920];

let leafletLoaded = false;

async function ensureLeaflet() {
  if (leafletLoaded || window.L) { leafletLoaded = true; return; }

  // Load CSS
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(link);

  // Load JS
  await new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = resolve;
    document.head.appendChild(script);
  });

  leafletLoaded = true;
}

/**
 * MapView — wraps Leaflet with OpenStreetMap tiles.
 *
 * Props:
 *  center       [lat, lng]  — map center (default: Kano)
 *  zoom         number      — zoom level (default: 14)
 *  pickupCoord  [lat, lng]  — orange pin (pickup)
 *  dropoffCoord [lat, lng]  — green pin (dropoff)
 *  riderCoord   [lat, lng]  — animated rider pin
 *  height       string      — CSS height (default: "220px")
 */
export default function MapView({
  center,
  zoom = 14,
  pickupCoord,
  dropoffCoord,
  riderCoord,
  height = "220px",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    let alive = true;

    ensureLeaflet().then(() => {
      if (!alive || !containerRef.current || mapRef.current) return;
      const L = window.L;

      const map = L.map(containerRef.current, {
        center: center || KANO_CENTER,
        zoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        // Use lower resolution tiles to save data
        tileSize: 256,
        detectRetina: false,
      }).addTo(map);

      mapRef.current = map;
      updateMarkers(L, map);
    });

    return () => {
      alive = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = {};
      }
    };
  }, []);

  // Update markers when coordinates change
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    updateMarkers(window.L, mapRef.current);
  }, [pickupCoord, dropoffCoord, riderCoord]);

  function updateMarkers(L, map) {
    const pinStyle = (emoji, color) =>
      L.divIcon({
        html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: "",
      });

    if (pickupCoord) {
      if (markersRef.current.pickup) {
        markersRef.current.pickup.setLatLng(pickupCoord);
      } else {
        markersRef.current.pickup = L.marker(pickupCoord, {
          icon: pinStyle("📍", "#FF5C1A"),
        }).addTo(map);
      }
    }

    if (dropoffCoord) {
      if (markersRef.current.dropoff) {
        markersRef.current.dropoff.setLatLng(dropoffCoord);
      } else {
        markersRef.current.dropoff = L.marker(dropoffCoord, {
          icon: pinStyle("🏁", "#22C55E"),
        }).addTo(map);
      }
    }

    if (riderCoord) {
      if (markersRef.current.rider) {
        markersRef.current.rider.setLatLng(riderCoord);
      } else {
        markersRef.current.rider = L.marker(riderCoord, {
          icon: pinStyle("🏍", "#3B82F6"),
        }).addTo(map);
      }
      map.panTo(riderCoord);
    }

    // Fit bounds if we have both pickup and dropoff
    if (pickupCoord && dropoffCoord) {
      map.fitBounds([pickupCoord, dropoffCoord], { padding: [40, 40] });
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        height,
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #2A2A38",
        position: "relative",
      }}
    />
  );
}

// ─── ADDRESS → COORDINATES (Nominatim geocoding) ──────────
// Free, no API key, good enough for Kano addresses
export async function geocodeAddress(address) {
  try {
    const q = encodeURIComponent(address + ", Kano, Nigeria");
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data.length === 0) return null;
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {
    return null;
  }
}
