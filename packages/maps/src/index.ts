export interface Coordinate {
  longitude: number;
  latitude: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

export const toMapboxLngLat = (coordinate: Coordinate): [number, number] => {
  return [coordinate.longitude, coordinate.latitude];
};

export const buildStaticMapUrl = (
  center: Coordinate,
  zoom = 12,
  width = 600,
  height = 400,
): string => {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error('MAPBOX_ACCESS_TOKEN is required');
  }

  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${center.longitude},${center.latitude},${zoom}/${width}x${height}?access_token=${token}`;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

export const calculateDistance = (from: Coordinate, to: Coordinate): number => {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitudeRadians = toRadians(from.latitude);
  const toLatitudeRadians = toRadians(to.latitude);

  const haversineA =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);
  const haversineC = 2 * Math.atan2(Math.sqrt(haversineA), Math.sqrt(1 - haversineA));

  return EARTH_RADIUS_METERS * haversineC;
};

export const formatCoordinates = (coordinate: Coordinate, precision = 5): string => {
  return `${coordinate.latitude.toFixed(precision)}, ${coordinate.longitude.toFixed(precision)}`;
};

export const isCourierNearLocation = (
  courier: Coordinate,
  location: Coordinate,
  radiusMeters = 100,
): boolean => {
  return calculateDistance(courier, location) <= radiusMeters;
};
