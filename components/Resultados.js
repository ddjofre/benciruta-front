'use client';

import { formatCLP, formatKm } from '../lib/format';

function Dato({ etiqueta, valor, destacado }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{etiqueta}</dt>
      <dd className={destacado ? 'text-lg font-bold' : 'font-semibold'}>{valor}</dd>
    </div>
  );
}

function TarjetaRecomendada({ e, litros, combustibleLabel, activa, errorRuta, cargandoRuta, onVerRuta }) {
  return (
    <article className="rounded-3xl border-2 border-green-500 bg-green-50 p-4 shadow-md">
      <p className="text-xs font-bold uppercase tracking-wide text-green-700">★ Estación recomendada</p>
      <h3 className="mt-1 text-xl font-bold">{e.marca || e.nombre}</h3>
      <p className="text-sm text-slate-600">
        {e.direccion}
        {e.comuna ? `, ${e.comuna}` : ''}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Dato etiqueta="Distancia desde el origen" valor={formatKm(e.distanciaKm)} />
        <Dato etiqueta={`Precio ${combustibleLabel}`} valor={`${formatCLP(e.precioLitro)}/L`} />
        <Dato etiqueta="Costo de traslado" valor={formatCLP(e.costoViaje)} />
        <Dato etiqueta={`Carga (${litros.toFixed(1).replace('.', ',')} L)`} valor={formatCLP(e.costoCarga)} />
        <Dato etiqueta="Costo total estimado" valor={formatCLP(e.costoTotal)} destacado />
        <Dato
          etiqueta="Ahorro vs. la más cercana"
          valor={e.ahorroVsMasCercana > 0 ? formatCLP(e.ahorroVsMasCercana) : 'Es la más cercana'}
          destacado
        />
      </dl>

      <button
        type="button"
        onClick={() => onVerRuta(e)}
        disabled={cargandoRuta}
        className="mt-4 h-12 w-full rounded-xl bg-green-600 font-bold text-white disabled:opacity-60"
      >
        {cargandoRuta ? 'Calculando ruta…' : activa ? 'Mostrando ruta ✓' : 'Ver ruta'}
      </button>
      {errorRuta && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-600">
          {errorRuta}
        </p>
      )}
    </article>
  );
}

function TarjetaAlterna({ e, indice, seleccionada, onSeleccionar, onVerRuta, cargandoRuta }) {
  return (
    <article
      className={`rounded-2xl border bg-white p-3 ${seleccionada ? 'border-amber-500 ring-2 ring-amber-200' : 'border-slate-200'}`}
    >
      <button type="button" onClick={() => onSeleccionar(e.id)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">
              {indice}. {e.marca || e.nombre}
            </p>
            <p className="truncate text-sm text-slate-500">{e.direccion}</p>
          </div>
          <p className="shrink-0 font-bold">{formatCLP(e.costoTotal)}</p>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {formatKm(e.distanciaKm)} · {formatCLP(e.precioLitro)}/L · traslado {formatCLP(e.costoViaje)}
        </p>
      </button>
      <button
        type="button"
        onClick={() => onVerRuta(e)}
        disabled={cargandoRuta}
        className="mt-2 h-10 w-full rounded-lg bg-slate-100 text-sm font-semibold disabled:opacity-60"
      >
        Ver ruta
      </button>
    </article>
  );
}

export default function Resultados({
  resultado,
  seleccionadaId,
  rutaDeId,
  errorRuta,
  cargandoRuta,
  onSeleccionar,
  onVerRuta,
  onModificar,
}) {
  const { mejorOpcion, ranking, litros, combustibleLabel, radioKm, litrosDesdeDinero } = resultado;
  const otras = ranking.filter((e) => e.id !== mejorOpcion.id);

  return (
    <div className="space-y-4 pb-2">
      {/* Barra fija: visible también con el panel minimizado */}
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 bg-white px-4 pb-2">
        <h2 className="font-bold">Resultados</h2>
        <button
          type="button"
          onClick={onModificar}
          className="h-9 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white"
        >
          ✎ Modificar búsqueda
        </button>
      </div>

      {litrosDesdeDinero && (
        <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Tu monto equivale a ~{litros.toFixed(1).replace('.', ',')} L, según el precio promedio de las estaciones del radio.
        </p>
      )}

      <TarjetaRecomendada
        e={mejorOpcion}
        litros={litros}
        combustibleLabel={combustibleLabel}
        activa={rutaDeId === mejorOpcion.id}
        errorRuta={rutaDeId === mejorOpcion.id || !rutaDeId ? errorRuta : null}
        cargandoRuta={cargandoRuta === mejorOpcion.id}
        onVerRuta={onVerRuta}
      />

      {otras.length > 0 && (
        <section>
          <h3 className="mb-2 font-semibold">Otras estaciones en {radioKm} km</h3>
          <div className="space-y-2">
            {otras.map((e, i) => (
              <TarjetaAlterna
                key={e.id}
                e={e}
                indice={i + 2}
                seleccionada={seleccionadaId === e.id}
                cargandoRuta={Boolean(cargandoRuta)}
                onSeleccionar={onSeleccionar}
                onVerRuta={onVerRuta}
              />
            ))}
          </div>
          {errorRuta && rutaDeId && rutaDeId !== mejorOpcion.id && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600">
              {errorRuta}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
