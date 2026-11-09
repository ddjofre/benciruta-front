'use client';

import { useState, useEffect, useRef } from 'react';
import { COMBUSTIBLES } from '../lib/config';
import { VEHICULOS, rendimientoDe, buscarClave } from '../lib/vehiculos';
import { formatMiles, parseMiles } from '../lib/format';
import { buscarDirecciones, ubicacionDeSugerencia } from '../lib/api';

export const MIN_DINERO = 1000;
export const MIN_LITROS = 1;

export function validarRendimiento(valor) {
  const n = Number(String(valor).replace(',', '.'));
  return !isNaN(n) && n >= 1 && n <= 50;
}

export function validarCantidad(modo, cantidad) {
  if (cantidad === '' || cantidad === undefined) return true;
  const n = modo === 'dinero' ? parseMiles(cantidad) : Number(String(cantidad).replace(',', '.'));
  if (isNaN(n)) return false;
  return n >= (modo === 'dinero' ? MIN_DINERO : MIN_LITROS);
}

function Bloque({ titulo, resumen, abierto, onToggle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-semibold">{titulo}</span>
        <span className="flex items-center gap-2 text-sm text-slate-500">
          {!abierto && resumen}
          <span aria-hidden>{abierto ? '▲' : '▼'}</span>
        </span>
      </button>
      {abierto && <div className="space-y-3 px-4 pb-4">{children}</div>}
    </div>
  );
}

const campo =
  'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400';

export default function ParamsPanel({ params, onCambio, onBuscar, buscando, origenListo }) {
  const [abiertos, setAbiertos] = useState({
    destino: false,
    vehiculo: true,
    combustible: true,
    volumen: true,
    radio: true,
  });
  const [rendBorrador, setRendBorrador] = useState(String(params.rendimiento));

  // Estado del autocompletado de destino
  const [textoDestino, setTextoDestino] = useState(params.destinoTexto || '');
  const [sugerenciasDestino, setSugerenciasDestino] = useState([]);
  const [abiertoDestino, setAbiertoDestino] = useState(false);

  const toggle = (k) => setAbiertos((a) => ({ ...a, [k]: !a[k] }));
  const set = (cambios) => onCambio({ ...params, ...cambios });

  const rendOk = validarRendimiento(rendBorrador);
  const cantidadOk = validarCantidad(params.modo, params.cantidad);
  const puedeBuscar = origenListo && validarRendimiento(params.rendimiento) && cantidadOk && !buscando;

  const marcas = Object.keys(VEHICULOS);
  const marcaValida = !!VEHICULOS[params.marca];
  const modelos = marcaValida ? Object.keys(VEHICULOS[params.marca]) : [];
  const modeloValido = marcaValida && !!VEHICULOS[params.marca][params.modelo];
  const anios = modeloValido ? Object.keys(VEHICULOS[params.marca][params.modelo]).reverse() : [];

  function elegirVehiculo(cambios) {
    const nuevo = { ...params, ...cambios };
    const r = rendimientoDe(nuevo.marca, nuevo.modelo, Number(nuevo.anio));
    if (r) setRendBorrador(String(r).replace('.', ','));
    onCambio({ ...nuevo, rendimiento: r ? String(r) : params.rendimiento });
  }

  // Búsqueda de sugerencias para destino
  useEffect(() => {
    if (!abiertoDestino || textoDestino.trim().length < 3) {
      setSugerenciasDestino([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setSugerenciasDestino(await buscarDirecciones(textoDestino.trim(), ctrl.signal));
      } catch {
        /* cancelado */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [textoDestino, abiertoDestino]);

  async function seleccionarDestino(s) {
    setTextoDestino(s.texto);
    setAbiertoDestino(false);
    setSugerenciasDestino([]);
    try {
      const { lat, lng } = await ubicacionDeSugerencia(s.id);
      set({ destinoLat: lat, destinoLng: lng, destinoTexto: s.texto });
    } catch {
      alert('No se pudo obtener la ubicación exacta del destino seleccionado.');
    }
  }

  function borrarDestino() {
    setTextoDestino('');
    setSugerenciasDestino([]);
    set({ destinoLat: null, destinoLng: null, destinoTexto: '' });
  }

  const resumenDestino = params.destinoTexto ? 'Definido ✓' : 'Ida y vuelta (sin destino)';
  const resumenVehiculo = `${String(params.rendimiento).replace('.', ',')} km/l`;
  const resumenComb = COMBUSTIBLES.find((c) => c.id === params.combustible)?.label;
  const resumenVol = params.cantidad
    ? params.modo === 'dinero'
      ? `$${params.cantidad}`
      : `${params.cantidad} L`
    : '30 L';

  return (
    <div className="space-y-3 pb-2">
      <h2 className="text-lg font-bold">¿Dónde te conviene cargar?</h2>

      {/* 0. Destino final opcional (Solicitud de cambio del ayudante) */}
      <Bloque
        titulo="Destino final (opcional)"
        resumen={resumenDestino}
        abierto={abiertos.destino}
        onToggle={() => toggle('destino')}
      >
        <p className="text-xs text-slate-500">
          Si vas camino a tu casa o trabajo, ingresa tu destino. El costo de traslado se calculará solo con el desvío extra en tu ruta.
        </p>
        <div className="relative">
          <input
            type="text"
            placeholder="Ej: Av. Grecia 1234, Trabajo, Casa..."
            value={textoDestino}
            onChange={(e) => {
              setTextoDestino(e.target.value);
              setAbiertoDestino(true);
            }}
            onFocus={() => setAbiertoDestino(true)}
            className={campo}
          />
          {textoDestino && (
            <button
              type="button"
              onClick={borrarDestino}
              className="absolute right-3 top-2.5 text-sm font-bold text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}

          {abiertoDestino && sugerenciasDestino.length > 0 && (
            <ul className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
              {sugerenciasDestino.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50"
                    onClick={() => seleccionarDestino(s)}
                  >
                    {s.texto}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {params.destinoLat && (
          <p className="text-xs font-semibold text-green-700">✓ Destino fijado: solo se computará el desvío extra</p>
        )}
      </Bloque>

      {/* 1. Datos del vehículo */}
      <Bloque
        titulo="Datos del vehículo"
        resumen={resumenVehiculo}
        abierto={abiertos.vehiculo}
        onToggle={() => toggle('vehiculo')}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            aria-label="Marca"
            list="lista-marcas"
            placeholder="Marca (escribe para buscar)"
            autoComplete="off"
            className={campo}
            value={params.marca}
            onChange={(e) => {
              const exacta = buscarClave(VEHICULOS, e.target.value);
              elegirVehiculo({ marca: exacta ?? e.target.value, modelo: '', anio: '' });
            }}
          />
          <datalist id="lista-marcas">
            {marcas.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <input
            aria-label="Modelo"
            list="lista-modelos"
            placeholder="Modelo (escribe para buscar)"
            autoComplete="off"
            className={campo}
            value={params.modelo}
            disabled={!marcaValida}
            onChange={(e) => {
              const exacto = buscarClave(VEHICULOS[params.marca], e.target.value);
              elegirVehiculo({ modelo: exacto ?? e.target.value, anio: '' });
            }}
          />
          <datalist id="lista-modelos">
            {modelos.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
          <select
            aria-label="Año"
            className={campo}
            value={params.anio}
            disabled={!modeloValido}
            onChange={(e) => elegirVehiculo({ anio: e.target.value })}
          >
            <option value="">Año</option>
            {anios.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="rend" className="mb-1 block text-sm font-medium">
            Rendimiento promedio (km/l)
          </label>
          <input
            id="rend"
            inputMode="decimal"
            value={rendBorrador}
            onChange={(e) => setRendBorrador(e.target.value.replace(/[^\d.,]/g, ''))}
            aria-invalid={!rendOk}
            className={`${campo} ${rendOk ? '' : 'border-red-500 focus:border-red-500 focus:ring-red-200'}`}
          />
          {!rendOk && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              Ingresa un rendimiento válido entre 1.0 y 50.0 km/l
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={!rendOk}
          onClick={() => set({ rendimiento: rendBorrador.replace(',', '.') })}
          className="h-11 w-full rounded-xl bg-slate-900 font-semibold text-white disabled:bg-slate-300"
        >
          Guardar/Aplicar
        </button>
      </Bloque>

      {/* 2. Tipo de combustible */}
      <Bloque
        titulo="Tipo de combustible"
        resumen={resumenComb}
        abierto={abiertos.combustible}
        onToggle={() => toggle('combustible')}
      >
        <div role="radiogroup" aria-label="Tipo de combustible" className="flex gap-2 overflow-x-auto pb-1">
          {COMBUSTIBLES.map((c) => {
            const sel = params.combustible === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => set({ combustible: c.id })}
                className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
                  sel ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Bloque>

      {/* 3. Volumen de carga */}
      <Bloque
        titulo="Volumen de carga"
        resumen={resumenVol}
        abierto={abiertos.volumen}
        onToggle={() => toggle('volumen')}
      >
        <div className="grid grid-cols-2 rounded-xl bg-slate-200 p-1" role="tablist" aria-label="Modo de ingreso">
          {[
            ['dinero', 'Monto en Dinero ($)'],
            ['litros', 'Litros Totales (L)'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={params.modo === id}
              onClick={() => set({ modo: id, cantidad: '' })}
              className={`h-9 rounded-lg text-sm font-semibold ${
                params.modo === id ? 'bg-white shadow' : 'text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor="cant" className="mb-1 block text-sm font-medium">
            {params.modo === 'dinero' ? 'Monto a cargar (CLP)' : 'Litros a cargar'}
          </label>
          <input
            id="cant"
            inputMode={params.modo === 'dinero' ? 'numeric' : 'decimal'}
            placeholder="30 L por defecto"
            value={params.cantidad}
            onChange={(e) =>
              set({
                cantidad:
                  params.modo === 'dinero'
                    ? formatMiles(e.target.value)
                    : e.target.value.replace(/[^\d.,]/g, ''),
              })
            }
            aria-invalid={!cantidadOk}
            className={`${campo} ${cantidadOk ? '' : 'border-red-500 focus:border-red-500 focus:ring-red-200'}`}
          />
          {!cantidadOk && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              El monto mínimo de carga debe ser mayor o igual a $1.000 CLP o 1 Litro
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {[10000, 20000].map((monto) => (
            <button
              key={monto}
              type="button"
              onClick={() => {
                const base = params.modo === 'dinero' ? parseMiles(params.cantidad) || 0 : 0;
                set({ modo: 'dinero', cantidad: formatMiles(String(base + monto)) });
              }}
              className="h-10 rounded-full bg-white px-4 text-sm font-semibold ring-1 ring-slate-300"
            >
              +${monto.toLocaleString('es-CL')}
            </button>
          ))}
          <button
            type="button"
            onClick={() => set({ modo: 'litros', cantidad: '40' })}
            className="h-10 rounded-full bg-white px-4 text-sm font-semibold ring-1 ring-slate-300"
          >
            +Llenar estanque (40 L)
          </button>
        </div>
      </Bloque>

      {/* 4. Radio de búsqueda */}
      <Bloque
        titulo="Radio de búsqueda"
        resumen={`${params.radioKm} km`}
        abierto={abiertos.radio}
        onToggle={() => toggle('radio')}
      >
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="radio">Distancia máxima</label>
          <strong>{params.radioKm} km</strong>
        </div>
        <input
          id="radio"
          type="range"
          min="1"
          max="20"
          step="1"
          value={params.radioKm}
          onChange={(e) => set({ radioKm: Number(e.target.value) })}
          className="h-8 w-full accent-blue-600"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>1 km</span>
          <span>20 km</span>
        </div>
      </Bloque>

      <button
        type="button"
        disabled={!puedeBuscar}
        onClick={onBuscar}
        className="h-14 w-full rounded-2xl bg-blue-600 text-lg font-bold text-white shadow disabled:bg-slate-300"
      >
        {buscando ? 'Buscando…' : 'Buscar mejor opción'}
      </button>
      {!origenListo && (
        <p className="text-center text-sm text-slate-500">
          Define un origen en el mapa o en el buscador para continuar.
        </p>
      )}
    </div>
  );
}