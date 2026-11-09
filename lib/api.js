import { API_URL, MAPBOX_TOKEN, NUNOA_BBOX, NUNOA_CENTER } from './config';

async function pedir(path, opciones) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, opciones);
  } catch {
    throw new Error('FUENTE_NO_DISPONIBLE');
  }
  if (!res.ok) throw new Error('FUENTE_NO_DISPONIBLE');
  return res.json();
}

export function obtenerEstacionesCercanas({ lat, lng, radioKm, tipoCombustible }) {
  const q = new URLSearchParams({ lat, lng, radioKm, tipoCombustible });
  return pedir(`/api/combustibles/estaciones-cercanas?${q}`);
}

export function calcularMejorOpcion(body) {
  return pedir('/api/combustibles/calcular', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

let sesionBusqueda = crypto.randomUUID();

function textoSugerencia(s) {
  const detalle = s.full_address || s.place_formatted || '';
  return detalle.toLowerCase().startsWith(String(s.name).toLowerCase())
    ? detalle
    : [s.name, detalle].filter(Boolean).join(', ');
}

export async function buscarDirecciones(texto, signal) {
  if (!MAPBOX_TOKEN) return [];
  const q = new URLSearchParams({
    q: texto,
    access_token: MAPBOX_TOKEN,
    session_token: sesionBusqueda,
    country: 'cl',
    language: 'es',
    limit: '5',
    types: 'poi,address,street,neighborhood',
    bbox: NUNOA_BBOX.join(','),
    proximity: `${NUNOA_CENTER.lng},${NUNOA_CENTER.lat}`,
  });
  const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?${q}`, { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.suggestions || []).map((s) => ({
    id: s.mapbox_id,
    texto: textoSugerencia(s),
  }));
}

export async function ubicacionDeSugerencia(id) {
  const q = new URLSearchParams({ access_token: MAPBOX_TOKEN, session_token: sesionBusqueda });
  const res = await fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${id}?${q}`);
  sesionBusqueda = crypto.randomUUID();
  if (!res.ok) throw new Error('UBICACION_NO_DISPONIBLE');
  const data = await res.json();
  const [lng, lat] = data.features?.[0]?.geometry?.coordinates || [];
  if (lat === undefined) throw new Error('UBICACION_NO_DISPONIBLE');
  return { lat, lng };
}

export async function direccionDesdeCoordenadas(lat, lng) {
  if (!MAPBOX_TOKEN) return null;
  try {
    const q = new URLSearchParams({
      access_token: MAPBOX_TOKEN,
      language: 'es',
      limit: '1',
      types: 'address,poi,neighborhood',
    });
    const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?${q}`);
    const data = await res.json();
    return data.features?.[0]?.place_name || null;
  } catch {
    return null;
  }
}

// Ruta con waypoints: si existe destinoFinal, traza Origen -> Estacion -> DestinoFinal
export async function obtenerRuta(origen, estacion, destinoFinal = null) {
  let coords = `${origen.lng},${origen.lat};${estacion.lng},${estacion.lat}`;
  if (destinoFinal && destinoFinal.lat && destinoFinal.lng) {
    coords += `;${destinoFinal.lng},${destinoFinal.lat}`;
  }

  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}` +
    `?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('RUTA_NO_DISPONIBLE');
  const data = await res.json();
  const ruta = data.routes?.[0];
  if (!ruta) throw new Error('RUTA_NO_DISPONIBLE');
  return { geometry: ruta.geometry, distanciaKm: ruta.distance / 1000 };
}