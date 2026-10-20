'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MAPBOX_TOKEN, NUNOA_CENTER } from '../lib/config';

// Círculo geodésico aproximado como polígono GeoJSON (radio en km)
function circulo(lat, lng, radioKm, pasos = 64) {
  const coords = [];
  const dLat = radioKm / 111.32;
  const dLng = radioKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= pasos; i++) {
    const a = (i / pasos) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
}

const VACIO = { type: 'FeatureCollection', features: [] };

function crearPin(color, texto) {
  const el = document.createElement('div');
  el.style.cssText = `
    width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;cursor:pointer;`;
  const t = document.createElement('span');
  t.textContent = texto;
  t.style.cssText = 'transform:rotate(45deg);color:#fff;font-weight:700;font-size:12px;';
  el.appendChild(t);
  return el;
}

export default function MapView({
  origen,
  radioKm,
  estaciones,
  recomendadaId,
  seleccionadaId,
  ruta,
  bottomInset,
  onElegirOrigen,
  onSeleccionarEstacion,
}) {
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const listo = useRef(false);
  const marcadorOrigen = useRef(null);
  const marcadoresEstaciones = useRef([]);
  const cbOrigen = useRef(onElegirOrigen);
  const cbEstacion = useRef(onSeleccionarEstacion);
  const [sinToken] = useState(!MAPBOX_TOKEN);

  cbOrigen.current = onElegirOrigen;
  cbEstacion.current = onSeleccionarEstacion;

  // Inicialización única del mapa
  useEffect(() => {
    if (!MAPBOX_TOKEN || mapa.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const m = new mapboxgl.Map({
      container: contenedor.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [NUNOA_CENTER.lng, NUNOA_CENTER.lat],
      zoom: 13.5,
      attributionControl: false,
    });
    m.addControl(new mapboxgl.AttributionControl({ compact: true }), 'top-right');

    m.on('load', () => {
      m.addSource('radio', { type: 'geojson', data: VACIO });
      m.addLayer({
        id: 'radio-relleno',
        type: 'fill',
        source: 'radio',
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.08 },
      });
      m.addLayer({
        id: 'radio-borde',
        type: 'line',
        source: 'radio',
        paint: { 'line-color': '#2563eb', 'line-width': 2 },
      });
      m.addSource('ruta', { type: 'geojson', data: VACIO });
      m.addLayer({
        id: 'ruta-borde',
        type: 'line',
        source: 'ruta',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 9 },
      });
      m.addLayer({
        id: 'ruta-linea',
        type: 'line',
        source: 'ruta',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#16a34a', 'line-width': 5 },
      });
      listo.current = true;
      m.fire('benci-listo');
    });

    // REQ-EP1-02: tap sobre el mapa fija el origen
    m.on('click', (e) => cbOrigen.current?.(e.lngLat.lat, e.lngLat.lng));

    mapa.current = m;
    return () => {
      // los marcadores pertenecen al mapa que se destruye: se descartan para recrearlos en el nuevo
      marcadorOrigen.current?.remove();
      marcadorOrigen.current = null;
      marcadoresEstaciones.current.forEach((x) => x.remove());
      marcadoresEstaciones.current = [];
      m.remove();
      mapa.current = null;
      listo.current = false;
    };
  }, []);

  // Marcador de origen (arrastrable) + círculo de radio
  useEffect(() => {
    const m = mapa.current;
    if (!m || !origen) return;

    const aplicar = () => {
      if (!marcadorOrigen.current) {
        const el = document.createElement('div');
        el.style.cssText =
          'width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25);';
        marcadorOrigen.current = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([origen.lng, origen.lat])
          .addTo(m);
        marcadorOrigen.current.on('dragend', () => {
          const p = marcadorOrigen.current.getLngLat();
          cbOrigen.current?.(p.lat, p.lng);
        });
      } else {
        marcadorOrigen.current.setLngLat([origen.lng, origen.lat]);
      }
      m.getSource('radio')?.setData(circulo(origen.lat, origen.lng, radioKm));
    };

    if (listo.current) aplicar();
    else m.once('benci-listo', aplicar);
  }, [origen, radioKm]);

  // Recentrado suave cuando cambia el origen
  useEffect(() => {
    const m = mapa.current;
    if (!m || !origen) return;
    m.easeTo({
      center: [origen.lng, origen.lat],
      duration: 800,
      padding: { top: 90, bottom: bottomInset || 0, left: 0, right: 0 },
    });
  }, [origen?.lat, origen?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // Marcadores de estaciones
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    marcadoresEstaciones.current.forEach((x) => x.remove());
    marcadoresEstaciones.current = [];

    (estaciones || []).forEach((e, i) => {
      const esRec = e.id === recomendadaId;
      const esSel = e.id === seleccionadaId;
      const el = crearPin(esRec ? '#16a34a' : esSel ? '#f59e0b' : '#64748b', esRec ? '★' : String(i + 1));
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        cbEstacion.current?.(e.id);
      });
      const mk = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([e.lng, e.lat]).addTo(m);
      marcadoresEstaciones.current.push(mk);
    });
  }, [estaciones, recomendadaId, seleccionadaId]);

  // Ruta hacia la estación elegida
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const aplicar = () => {
      m.getSource('ruta')?.setData(ruta ? { type: 'Feature', geometry: ruta.geometry } : VACIO);
      if (ruta && origen) {
        const b = new mapboxgl.LngLatBounds();
        ruta.geometry.coordinates.forEach((c) => b.extend(c));
        b.extend([origen.lng, origen.lat]); // el origen puede quedar fuera del trazo (se ajusta a la calle)
        m.fitBounds(b, { padding: { top: 100, bottom: (bottomInset || 0) + 30, left: 40, right: 40 }, duration: 900 });
      }
    };
    if (listo.current) aplicar();
    else m.once('benci-listo', aplicar);
  }, [ruta]); // eslint-disable-line react-hooks/exhaustive-deps

  if (sinToken) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-200 p-8 text-center">
        <div className="max-w-sm rounded-xl bg-white p-5 shadow">
          <p className="font-semibold">Falta el token de Mapbox</p>
          <p className="mt-2 text-sm text-slate-600">
            Crea el archivo <code>.env.local</code> en <code>benciruta-front</code> con{' '}
            <code>NEXT_PUBLIC_MAPBOX_TOKEN=pk...</code> y reinicia <code>npm run dev</code>.
          </p>
        </div>
      </div>
    );
  }

  // Mapbox fuerza position:relative en su contenedor, por eso va dentro de un envoltorio absoluto
  return (
    <div className="absolute inset-0">
      <div ref={contenedor} className="h-full w-full" />
    </div>
  );
}
