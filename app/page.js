'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import SearchBar from '../components/SearchBar';
import BottomSheet from '../components/BottomSheet';
import ParamsPanel from '../components/ParamsPanel';
import Resultados from '../components/Resultados';
import Modal from '../components/Modal';
import { COMBUSTIBLES, DEFAULTS, dentroDeCobertura } from '../lib/config';
import { parseMiles } from '../lib/format';
import {
  calcularMejorOpcion,
  direccionDesdeCoordenadas,
  obtenerEstacionesCercanas,
  obtenerRuta,
} from '../lib/api';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

const PARAMS_INICIALES = {
  marca: '',
  modelo: '',
  anio: '',
  rendimiento: String(DEFAULTS.rendimientoKmL),
  combustible: DEFAULTS.combustible,
  modo: 'dinero',
  cantidad: '',
  radioKm: DEFAULTS.radioKm,
};

const MSG_FUERA_COBERTURA =
  'Dirección no encontrada dentro del área de cobertura. Por favor, intenta con otra referencia o selecciona directamente en el mapa';

export default function Home() {
  const [origen, setOrigen] = useState(null);
  const [direccion, setDireccion] = useState('');
  const [errorDireccion, setErrorDireccion] = useState('');
  const [enfocarBuscador, setEnfocarBuscador] = useState(0);

  const [params, setParams] = useState(PARAMS_INICIALES);
  const [cargado, setCargado] = useState(false);

  const [estadoSheet, setEstadoSheet] = useState('medio');
  const [alturaSheet, setAlturaSheet] = useState(0);
  const [vista, setVista] = useState('parametros');

  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [seleccionadaId, setSeleccionadaId] = useState(null);

  const [ruta, setRuta] = useState(null);
  const [rutaDeId, setRutaDeId] = useState(null);
  const [cargandoRuta, setCargandoRuta] = useState(null);
  const [errorRuta, setErrorRuta] = useState('');

  const [modal, setModal] = useState(null);
  const [aviso, setAviso] = useState('');
  const geoPedida = useRef(false);
  const origenManual = useRef(false); // true cuando el usuario eligió el origen a mano
  const origenSeq = useRef(0); // identifica la última elección de origen

  // Persistencia local de parámetros (no hay cuentas ni base de datos)
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem('benciruta-params') || 'null');
      if (guardado) {
        // REQ-EP1-04: si el combustible guardado no es válido, forzar 95 y avisar
        if (!COMBUSTIBLES.some((c) => c.id === guardado.combustible)) {
          guardado.combustible = DEFAULTS.combustible;
          setAviso('Se ha seleccionado 95 Octanos por defecto');
        }
        setParams({ ...PARAMS_INICIALES, ...guardado });
      }
    } catch {
      /* almacenamiento no disponible */
    }
    setCargado(true);
  }, []);

  useEffect(() => {
    if (!cargado) return;
    try {
      localStorage.setItem('benciruta-params', JSON.stringify(params));
    } catch {
      /* ignorar */
    }
  }, [params, cargado]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 3500);
    return () => clearTimeout(t);
  }, [aviso]);

  const limpiarResultados = useCallback(() => {
    setResultado(null);
    setRuta(null);
    setRutaDeId(null);
    setSeleccionadaId(null);
    setErrorRuta('');
    setVista('parametros');
  }, []);

  // REQ-EP1-02: fija el origen validando la cobertura (RN-01)
  const elegirOrigen = useCallback(
    async (lat, lng, texto, desdeGps = false) => {
      if (!dentroDeCobertura(lat, lng)) {
        setErrorDireccion(MSG_FUERA_COBERTURA);
        return;
      }
      origenManual.current = !desdeGps;
      const seq = ++origenSeq.current;
      setErrorDireccion('');
      setOrigen({ lat, lng });
      limpiarResultados();
      setDireccion(texto || 'Ubicación seleccionada en el mapa');
      if (!texto) {
        const d = await direccionDesdeCoordenadas(lat, lng);
        // si mientras tanto se eligió otro origen, esta dirección ya no corresponde
        if (d && seq === origenSeq.current) setDireccion(d);
      }
    },
    [limpiarResultados]
  );

  // REQ-EP1-01: geolocalización con timeout de 5 s
  const usarMiUbicacion = useCallback((explicito = false) => {
    const fallar = () => {
      if (!explicito && origenManual.current) return;
      setModal({
        titulo: 'No pudimos acceder a tu ubicación',
        mensaje:
          'No se pudo acceder a tu ubicación actual. Por favor, selecciona un punto en el mapa o ingresa una dirección manualmente',
        acciones: [
          {
            label: 'Ingresar dirección',
            primario: true,
            onClick: () => {
              setModal(null);
              setEnfocarBuscador((n) => n + 1);
            },
          },
          { label: 'Elegir en el mapa', onClick: () => setModal(null) },
        ],
      });
    };
    if (!navigator.geolocation) return fallar();

    let respondido = false;
    const corte = setTimeout(() => {
      if (!respondido) {
        respondido = true;
        fallar();
      }
    }, 5000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (respondido) return;
        respondido = true;
        clearTimeout(corte);
        // una respuesta tardía del GPS no debe pisar una dirección elegida a mano
        if (!explicito && origenManual.current) return;
        elegirOrigen(pos.coords.latitude, pos.coords.longitude, undefined, true);
      },
      () => {
        if (respondido) return;
        respondido = true;
        clearTimeout(corte);
        fallar();
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  }, [elegirOrigen]);

  useEffect(() => {
    if (geoPedida.current) return;
    geoPedida.current = true;
    usarMiUbicacion(false);
  }, [usarMiUbicacion]);

  // REQ-EP2-01, EP3-01: búsqueda y recomendación
  const buscar = useCallback(
    async (radioOverride) => {
      if (!origen) return;
      const radioKm = radioOverride ?? params.radioKm;
      const comb = COMBUSTIBLES.find((c) => c.id === params.combustible) || COMBUSTIBLES[1];
      setBuscando(true);
      setErrorRuta('');
      setModal(null);

      const reintentar = () => buscar(radioOverride);
      try {
        const cercanas = await obtenerEstacionesCercanas({
          lat: origen.lat,
          lng: origen.lng,
          radioKm,
          tipoCombustible: comb.apiId,
        });
        const enCobertura = (cercanas.estaciones || []).filter((e) => dentroDeCobertura(e.lat, e.lng));

        if (enCobertura.length === 0) {
          const ampliado = Math.min(20, radioKm + 5);
          setModal({
            titulo: 'Sin estaciones disponibles',
            mensaje:
              ampliado > radioKm
                ? `No se encontraron estaciones en un radio de ${radioKm} km. ¿Deseas ampliar la búsqueda a ${ampliado} km?`
                : 'No se encontraron estaciones disponibles dentro del radio seleccionado',
            acciones: [
              ...(ampliado > radioKm
                ? [
                    {
                      label: `Ampliar a ${ampliado} km`,
                      primario: true,
                      onClick: () => {
                        setParams((p) => ({ ...p, radioKm: ampliado }));
                        buscar(ampliado);
                      },
                    },
                  ]
                : []),
              { label: 'Cerrar', onClick: () => setModal(null) },
            ],
          });
          return;
        }

        // RN-02: monto en pesos -> litros con el precio promedio de las candidatas
        const promedio = enCobertura.reduce((s, e) => s + e.precioLitro, 0) / enCobertura.length;
        let litros = DEFAULTS.litros;
        let litrosDesdeDinero = false;
        if (params.cantidad) {
          if (params.modo === 'dinero') {
            litros = parseMiles(params.cantidad) / promedio;
            litrosDesdeDinero = true;
          } else {
            litros = Number(String(params.cantidad).replace(',', '.'));
          }
        }

        const calculo = await calcularMejorOpcion({
          lat: origen.lat,
          lng: origen.lng,
          litrosACargar: litros,
          rendimientoKmL: Number(params.rendimiento),
          radioMaxKm: radioKm,
          tipoCombustible: comb.apiId,
        });
        // /calcular no devuelve coordenadas ni marca: se completan desde /estaciones-cercanas por id
        const porId = new Map(enCobertura.map((e) => [e.id, e]));
        const ranking = (calculo.ranking || [])
          .filter((e) => porId.has(e.id))
          .map((e) => {
            const { lat, lng, marca, comuna } = porId.get(e.id);
            return { ...e, lat, lng, marca, comuna };
          });

        if (ranking.length === 0) {
          setModal({
            titulo: 'Sin alternativas',
            mensaje: 'No se encontró ninguna alternativa disponible en este momento.',
            acciones: [{ label: 'Cerrar', onClick: () => setModal(null) }],
          });
          return;
        }

        // El ahorro se recalcula sobre las estaciones que quedaron dentro de la comuna
        const masCercana = [...ranking].sort((a, b) => a.distanciaKm - b.distanciaKm)[0];
        const conAhorro = ranking.map((e) => ({ ...e, ahorroVsMasCercana: masCercana.costoTotal - e.costoTotal }));

        setRuta(null);
        setRutaDeId(null);
        setSeleccionadaId(null);
        setResultado({
          ranking: conAhorro,
          mejorOpcion: conAhorro[0],
          litros,
          litrosDesdeDinero,
          combustibleLabel: comb.label,
          radioKm,
        });
        setVista('resultados');
        setEstadoSheet('medio');
      } catch {
        setModal({
          titulo: 'No fue posible obtener los datos',
          mensaje: 'No fue posible obtener los datos necesarios de estaciones y precios. Puedes reintentar la consulta.',
          acciones: [
            { label: 'Reintentar', primario: true, onClick: reintentar },
            { label: 'Cerrar', onClick: () => setModal(null) },
          ],
        });
      } finally {
        setBuscando(false);
      }
    },
    [origen, params]
  );

  // REQ-EP3-03: ruta hacia la estación elegida
  const verRuta = useCallback(
    async (estacion) => {
      if (!origen) return;
      setErrorRuta('');
      setCargandoRuta(estacion.id);
      setSeleccionadaId(estacion.id);
      try {
        const r = await obtenerRuta(origen, { lat: estacion.lat, lng: estacion.lng });
        setRuta(r);
        setRutaDeId(estacion.id);
        setEstadoSheet('minimizado'); // baja el panel para dejar ver la ruta en el mapa
      } catch {
        setRutaDeId(estacion.id);
        setErrorRuta('No fue posible mostrar la ruta seleccionada. Intenta nuevamente.');
      } finally {
        setCargandoRuta(null);
      }
    },
    [origen]
  );

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView
        origen={origen}
        radioKm={params.radioKm}
        estaciones={resultado?.ranking}
        recomendadaId={resultado?.mejorOpcion.id}
        seleccionadaId={seleccionadaId}
        ruta={ruta}
        bottomInset={alturaSheet}
        onElegirOrigen={elegirOrigen}
        onSeleccionarEstacion={setSeleccionadaId}
      />

      {/* Barra superior de búsqueda */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <SearchBar
          direccion={direccion}
          errorDireccion={errorDireccion}
          onElegir={elegirOrigen}
          onErrorUbicacion={() => setErrorDireccion(MSG_FUERA_COBERTURA)}
          autoFocus={enfocarBuscador}
        />
      </div>

      {/* Botón flotante: usar mi ubicación actual */}
      <button
        type="button"
        onClick={() => usarMiUbicacion(true)}
        aria-label="Usar mi ubicación actual"
        title="Usar mi ubicación actual"
        className="absolute right-3 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-white text-xl text-blue-600 shadow-lg ring-1 ring-slate-200"
        style={{ bottom: alturaSheet + 16 }}
      >
        ◎
      </button>

      {aviso && (
        <div role="status" className="absolute inset-x-0 top-24 z-30 mx-auto w-fit max-w-[90%] rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">
          {aviso}
        </div>
      )}

      <BottomSheet estado={estadoSheet} onEstado={setEstadoSheet} onAltura={setAlturaSheet}>
        {vista === 'resultados' && resultado ? (
          <Resultados
            resultado={resultado}
            seleccionadaId={seleccionadaId}
            rutaDeId={rutaDeId}
            errorRuta={errorRuta}
            cargandoRuta={cargandoRuta}
            onSeleccionar={setSeleccionadaId}
            onVerRuta={verRuta}
            onModificar={() => {
              setVista('parametros');
              setEstadoSheet('expandido');
            }}
          />
        ) : (
          <>
            {resultado && (
              <button
                type="button"
                onClick={() => {
                  setVista('resultados');
                  setEstadoSheet('medio');
                }}
                className="mb-3 h-10 w-full rounded-xl bg-slate-100 text-sm font-semibold text-slate-700"
              >
                ← Volver a resultados
              </button>
            )}
            <ParamsPanel
              params={params}
              onCambio={setParams}
              onBuscar={() => buscar()}
              buscando={buscando}
              origenListo={Boolean(origen)}
            />
          </>
        )}
      </BottomSheet>

      {modal && <Modal {...modal} onCerrar={() => setModal(null)} />}
    </main>
  );
}
