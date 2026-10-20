'use client';

// Alerta emergente reutilizable (sin ubicación, sin estaciones, errores de fuente)
export default function Modal({ titulo, mensaje, acciones, onCerrar }) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 p-5" onClick={onCerrar}>
      <div
        role="alertdialog"
        aria-labelledby="modal-titulo"
        aria-describedby="modal-msg"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id="modal-titulo" className="text-lg font-bold">
          {titulo}
        </h2>
        <p id="modal-msg" className="mt-2 text-sm text-slate-600">
          {mensaje}
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {acciones.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              className={`h-12 rounded-xl font-semibold ${
                a.primario ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
