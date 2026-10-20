'use client';

import { useEffect, useRef, useState } from 'react';

// Panel inferior con 3 estados: minimizado, medio y expandido (10.1)
const ESTADOS = ['minimizado', 'medio', 'expandido'];
const ALTURA_MIN = 76;

export default function BottomSheet({ estado, onEstado, onAltura, children }) {
  const [alto, setAlto] = useState(0);
  const [arrastre, setArrastre] = useState(null);
  const inicio = useRef(null);

  useEffect(() => {
    const calc = () => setAlto(window.innerHeight);
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const alturas = {
    minimizado: ALTURA_MIN,
    medio: Math.round(alto * 0.45),
    expandido: Math.round(alto * 0.88),
  };
  const actual = arrastre ?? alturas[estado];

  useEffect(() => {
    if (alto) onAltura?.(alturas[estado]);
  }, [estado, alto]); // eslint-disable-line react-hooks/exhaustive-deps

  function bajar(e) {
    inicio.current = { y: e.clientY, h: alturas[estado], movido: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function mover(e) {
    if (!inicio.current) return;
    const dy = inicio.current.y - e.clientY;
    if (Math.abs(dy) > 4) inicio.current.movido = true;
    setArrastre(Math.max(ALTURA_MIN, Math.min(alturas.expandido, inicio.current.h + dy)));
  }
  function soltar() {
    if (!inicio.current) return;
    const { movido } = inicio.current;
    if (movido && arrastre !== null) {
      // snap al estado más cercano
      const masCercano = ESTADOS.reduce((a, b) => (Math.abs(alturas[b] - arrastre) < Math.abs(alturas[a] - arrastre) ? b : a));
      onEstado(masCercano);
    } else {
      // tap en el asa: cicla minimizado -> medio -> expandido -> medio
      onEstado(estado === 'medio' ? 'expandido' : 'medio');
    }
    inicio.current = null;
    setArrastre(null);
  }

  return (
    <section
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,.18)]"
      style={{
        height: actual || ALTURA_MIN,
        transition: arrastre === null ? 'height 220ms ease' : 'none',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Ajustar tamaño del panel"
        onPointerDown={bajar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onEstado(estado === 'medio' ? 'expandido' : 'medio');
        }}
        className="flex shrink-0 cursor-grab touch-none justify-center py-3 active:cursor-grabbing"
      >
        <span className="h-1.5 w-12 rounded-full bg-slate-300" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {children}
      </div>
    </section>
  );
}
