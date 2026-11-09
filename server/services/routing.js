const axios = require('axios');

/**
 * Calculate Haversine distance between two coordinates in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Search locations using OpenStreetMap Nominatim with United States priority
 */
async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const url = 'https://nominatim.openstreetmap.org/search';
    const response = await axios.get(url, {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 8,
        countrycodes: 'us' // Prioritize United States locations
      },
      headers: {
        'User-Agent': 'USExpenseReimbursementAutomation/1.0'
      },
      timeout: 5000
    });

    let results = response.data || [];
    // If no US results found, search without country restriction
    if (results.length === 0) {
      const fallbackResponse = await axios.get(url, {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 8
        },
        headers: {
          'User-Agent': 'USExpenseReimbursementAutomation/1.0'
        },
        timeout: 5000
      });
      results = fallbackResponse.data || [];
    }

    return results.map(item => ({
      displayName: item.display_name,
      name: item.name || item.display_name.split(',')[0],
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      country: item.address ? item.address.country : 'United States'
    }));
  } catch (err) {
    console.warn('Geocoding search warning:', err.message);
    return [];
  }
}

/**
 * Calculate multi-leg route: Home -> Stop 1 -> Stop 2 -> ... -> Stop N -> Home
 * @param {Object} homeLocation - { name, lat, lng }
 * @param {Array} stops - Array of { name, lat, lng }
 * @param {Object} options - { googleMapsKey }
 */
async function calculateCompleteRoute(homeLocation, stops, options = {}) {
  // Build full sequence of points: Home -> Stops... -> Home
  const points = [
    { name: `Home (${homeLocation.name})`, lat: homeLocation.lat, lng: homeLocation.lng, type: 'home_start' },
    ...stops.map((s, idx) => ({
      name: s.name || `Stop ${idx + 1}`,
      lat: s.lat,
      lng: s.lng,
      type: 'stop',
      stopIndex: idx + 1
    })),
    { name: `Home Return (${homeLocation.name})`, lat: homeLocation.lat, lng: homeLocation.lng, type: 'home_return' }
  ];

  // If Google Maps API Key is provided, use Google Directions API
  if (options.googleMapsKey) {
    try {
      const googleResult = await calculateWithGoogle(points, options.googleMapsKey);
      if (googleResult) return googleResult;
    } catch (e) {
      console.warn('Google Maps routing failed, falling back to OSRM:', e.message);
    }
  }

  // Try OSRM (Open Source Routing Machine)
  try {
    // OSRM expects coordinates in "lng,lat" format
    const coordString = points.map(p => `${p.lng},${p.lat}`).join(';');
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson&steps=false`;
    
    const response = await axios.get(osrmUrl, { timeout: 8000 });
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const totalDistanceKm = Number((route.distance / 1000).toFixed(2));
      const totalDurationMin = Math.round(route.duration / 60);

      // Extract leg distances
      const legs = (route.legs || []).map((leg, i) => {
        const from = points[i];
        const to = points[i + 1];
        const distanceKm = Number((leg.distance / 1000).toFixed(2));
        const durationMin = Math.round(leg.duration / 60);

        return {
          legNumber: i + 1,
          fromName: from.name,
          toName: to.name,
          fromCoords: [from.lat, from.lng],
          toCoords: [to.lat, to.lng],
          distanceKm,
          durationMin,
          description: `${from.name} ➔ ${to.name}`
        };
      });

      // GeoJSON coordinates array: [ [lng, lat], ... ] -> convert to Leaflet [ [lat, lng], ... ]
      const polyline = (route.geometry && route.geometry.coordinates)
        ? route.geometry.coordinates.map(coord => [coord[1], coord[0]])
        : points.map(p => [p.lat, p.lng]);

      return {
        success: true,
        method: 'OSRM Driving Engine',
        totalDistanceKm,
        totalDurationMin,
        legs,
        waypoints: points,
        polyline
      };
    }
  } catch (osrmErr) {
    console.warn('OSRM routing failed, calculating via road-adjusted Haversine:', osrmErr.message);
  }

  // Fallback: Haversine distance with 1.25 road curvature winding factor
  const ROAD_WINDING_FACTOR = 1.25;
  let fallbackTotalKm = 0;
  const fallbackLegs = [];

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const directKm = haversineDistance(from.lat, from.lng, to.lat, to.lng);
    const roadKm = Number((directKm * ROAD_WINDING_FACTOR).toFixed(2));
    fallbackTotalKm += roadKm;

    fallbackLegs.push({
      legNumber: i + 1,
      fromName: from.name,
      toName: to.name,
      fromCoords: [from.lat, from.lng],
      toCoords: [to.lat, to.lng],
      distanceKm: roadKm,
      durationMin: Math.round((roadKm / 45) * 60), // assume 45 km/h avg speed
      description: `${from.name} ➔ ${to.name}`
    });
  }

  return {
    success: true,
    method: 'Calculated GPS Distance (1.25x Road Factor)',
    totalDistanceKm: Number(fallbackTotalKm.toFixed(2)),
    totalDurationMin: Math.round((fallbackTotalKm / 45) * 60),
    legs: fallbackLegs,
    waypoints: points,
    polyline: points.map(p => [p.lat, p.lng])
  };
}

async function calculateWithGoogle(points, apiKey) {
  // Use Google Maps Directions API
  const origin = `${points[0].lat},${points[0].lng}`;
  const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
  const waypoints = points.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=${waypoints}&key=${apiKey}`;
  const response = await axios.get(url);
  if (response.data && response.data.routes && response.data.routes.length > 0) {
    const route = response.data.routes[0];
    let totalMeters = 0;
    const legs = route.legs.map((l, i) => {
      totalMeters += l.distance.value;
      return {
        legNumber: i + 1,
        fromName: points[i].name,
        toName: points[i + 1].name,
        fromCoords: [points[i].lat, points[i].lng],
        toCoords: [points[i + 1].lat, points[i + 1].lng],
        distanceKm: Number((l.distance.value / 1000).toFixed(2)),
        durationMin: Math.round(l.duration.value / 60),
        description: `${points[i].name} ➔ ${points[i + 1].name}`
      };
    });

    return {
      success: true,
      method: 'Google Maps Directions API',
      totalDistanceKm: Number((totalMeters / 1000).toFixed(2)),
      legs,
      waypoints: points,
      polyline: points.map(p => [p.lat, p.lng])
    };
  }
  return null;
}

module.exports = {
  searchLocations,
  calculateCompleteRoute,
  haversineDistance
};
