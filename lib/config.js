export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// RN-01: el MVP opera solo dentro de Ñuñoa (bbox aproximado: oeste, sur, este, norte)
export const NUNOA_BBOX = [-70.635, -33.49, -70.53, -33.43];
export const NUNOA_CENTER = { lat: -33.4569, lng: -70.5976 };

export const DEFAULTS = {
  rendimientoKmL: 10,
  combustible: '95',
  litros: 30,
  radioKm: 5,
};

export const COMBUSTIBLES = [
  { id: '93', apiId: 'gasolina 93', label: '93 Octanos' },
  { id: '95', apiId: 'gasolina 95', label: '95 Octanos' },
  { id: '97', apiId: 'gasolina 97', label: '97 Octanos' },
  { id: 'diesel', apiId: 'diesel', label: 'Diésel' },
];

export function dentroDeCobertura(lat, lng) {
  const [w, s, e, n] = NUNOA_BBOX;
  return lng >= w && lng <= e && lat >= s && lat <= n;
}
