import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix Leaflet's default icon paths in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom styled div icons for clear visual differentiation
const createCustomIcon = (text, bgColor, borderColor = '#ffffff') => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${bgColor};
        color: white;
        font-weight: 700;
        font-size: 11px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid ${borderColor};
        box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      ">
        ${text}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

export default function RouteMap({ home, stops = [], polyline = [], height = '360px', showLegDetails = false }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to central Pakistan coordinates
      const initialLat = home && home.lat ? home.lat : 30.3753;
      const initialLng = home && home.lng ? home.lng : 69.3451;
      const initialZoom = home && home.lat ? 10 : 6;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: initialZoom,
        zoomControl: true,
        scrollWheelZoom: false
      });

      // OpenStreetMap clean tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const allPoints = [];

    // 1. Plot Home location (Green House / Start & End)
    if (home && home.lat && home.lng) {
      const homeCoords = [parseFloat(home.lat), parseFloat(home.lng)];
      allPoints.push(homeCoords);

      const homeIcon = createCustomIcon('🏠', '#16a34a', '#ffffff');
      const homeMarker = L.marker(homeCoords, { icon: homeIcon }).addTo(layerGroup);
      homeMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px;">
          <strong style="color: #16a34a;">🏡 Employee Home (Start & End)</strong><br/>
          <span>${home.name || home.displayName || 'Home Location'}</span>
        </div>
      `);
    }

    // 2. Plot Intermediate Stops
    if (Array.isArray(stops)) {
      stops.forEach((stop, index) => {
        if (stop && stop.lat && stop.lng) {
          const stopCoords = [parseFloat(stop.lat), parseFloat(stop.lng)];
          allPoints.push(stopCoords);

          const stopIcon = createCustomIcon(`${index + 1}`, '#2563eb', '#ffffff');
          const marker = L.marker(stopCoords, { icon: stopIcon }).addTo(layerGroup);
          marker.bindPopup(`
            <div style="font-family: inherit; font-size: 13px;">
              <strong style="color: #2563eb;">Stop ${index + 1}</strong><br/>
              <span>${stop.name || stop.displayName || `Stop #${index + 1}`}</span>
            </div>
          `);
        }
      });
    }

    // 3. Draw Route Polyline
    let routeLineCoords = [];
    if (Array.isArray(polyline) && polyline.length > 1) {
      routeLineCoords = polyline;
    } else if (allPoints.length > 1) {
      // Connect Home -> Stop 1 -> ... -> Stop N -> Home
      routeLineCoords = [...allPoints, allPoints[0]];
    }

    if (routeLineCoords.length > 1) {
      const line = L.polyline(routeLineCoords, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.85,
        dashArray: polyline.length > 1 ? null : '6, 8', // dashed if straight haversine
        lineJoin: 'round'
      }).addTo(layerGroup);

      // Fit bounds
      try {
        map.fitBounds(line.getBounds(), { padding: [35, 35] });
      } catch {
        // ignore bounds fit error if coordinates coincide
      }
    } else if (allPoints.length === 1) {
      map.setView(allPoints[0], 12);
    }

    // Force map size invalidation to avoid rendering artifacts
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 200);

  }, [home, stops, polyline]);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 isolate z-0">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      
      {/* Route Legend Overlay */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 text-xs shadow-xs flex items-center gap-3 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block"></span>
          <span className="font-medium text-slate-700">Home (Origin & Return)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-600 inline-block"></span>
          <span className="font-medium text-slate-700">Stops Visited</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-blue-500 inline-block"></span>
          <span className="font-medium text-slate-700">Travel Route</span>
        </div>
      </div>
    </div>
  );
}
