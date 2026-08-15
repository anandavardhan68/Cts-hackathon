// Haversine distance + velocity — computed in application code, NOT in
// Postgres (no PostGIS, per the locked tech stack in §2/§12 of the arch doc).

const EARTH_RADIUS_KM = 6371;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two lat/lng points, in kilometers.
 */
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Implied velocity (km/h) between two timestamped points.
 * Guards against divide-by-zero for two transactions in the same instant.
 */
function velocityKmh(distanceKm, fromTimestamp, toTimestamp) {
  const hoursElapsed = (new Date(toTimestamp) - new Date(fromTimestamp)) / (1000 * 60 * 60);
  if (hoursElapsed <= 0) return distanceKm > 0 ? Infinity : 0;
  return distanceKm / hoursElapsed;
}

module.exports = { haversineDistanceKm, velocityKmh };
