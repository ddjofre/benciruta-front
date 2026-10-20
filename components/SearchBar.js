'use client';

import { useEffect, useRef, useState } from 'react';
import { buscarDirecciones, ubicacionDeSugerencia } from '../lib/api';

// REQ-EP1-02: "Origen de búsqueda" con autocompletado desde 3 caracteres
export default function SearchBar({ direccion, errorDireccion, onElegir, onErrorUbicacion, autoFocus }) {
  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    // no pisar lo que el usuario está escribiendo en este momento
    if (direccion && document.activeElement !== ref.current) setTexto(direccion);
  }, [direccion]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (!abierto || texto.trim().length < 3) {
      setSugerencias([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        setSugerencias(await buscarDirecciones(texto.trim(), ctrl.signal));
      } catch {
        /* petición cancelada */
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [texto, abierto]);

  async function elegir(s) {
    setTexto(s.texto);
    setAbierto(false);
    setSugerencias([]);
    ref.current?.blur();
    try {
      const { lat, lng } = await ubicacionDeSugerencia(s.id);
      onElegir(lat, lng, s.texto);
    } catch {
      onErrorUbicacion?.();
    }
  }

  return (
    <div className="pointer-events-auto relative">
      <label htmlFor="origen" className="sr-only">
        Origen de búsqueda
      </label>
      <div className="flex items-center rounded-xl bg-white px-3 shadow-lg ring-1 ring-slate-200">
        <span aria-hidden className="mr-2 text-blue-600">
          ⌖
        </span>
        <input
          id="origen"
          ref={ref}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            // Enter elige la primera sugerencia
            if (e.key === 'Enter' && sugerencias[0]) {
              e.preventDefault();
              elegir(sugerencias[0]);
            }
          }}
          placeholder="Origen de búsqueda"
          autoComplete="off"
          className="h-12 w-full bg-transparent text-base outline-none"
        />
        {texto && (
          <button
            type="button"
            aria-label="Borrar"
            onClick={() => {
              setTexto('');
              setSugerencias([]);
              ref.current?.focus();
            }}
            className="px-2 text-slate-400"
          >
            ✕
          </button>
        )}
      </div>

      {abierto && sugerencias.length > 0 && (
        <ul className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {sugerencias.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50"
                onClick={() => elegir(s)}
              >
                {s.texto}
              </button>
            </li>
          ))}
        </ul>
      )}

      {errorDireccion && (
        <p role="alert" className="mt-1 rounded-lg bg-white/95 px-3 py-2 text-sm font-medium text-red-600 shadow">
          {errorDireccion}
        </p>
      )}
    </div>
  );
}
