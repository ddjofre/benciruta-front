// RN-05: distancias en km, rendimiento en km/L, volumen en litros, dinero en CLP
const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function formatCLP(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return 'No disponible';
  return clp.format(Math.round(valor));
}

export function formatKm(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return 'No disponible';
  return `${Number(valor).toFixed(2).replace('.', ',')} km`;
}

export function formatMiles(texto) {
  const digitos = String(texto).replace(/\D/g, '');
  if (!digitos) return '';
  return Number(digitos).toLocaleString('es-CL');
}

export function parseMiles(texto) {
  return Number(String(texto).replace(/\./g, '').replace(',', '.'));
}
