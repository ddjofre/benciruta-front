// Catálogo de ejemplo para el MVP: rendimiento mixto aproximado en km/L.
export const VEHICULOS = {
  Toyota: {
    Yaris: { 2018: 13.5, 2019: 13.5, 2020: 12.5, 2021: 12.5, 2022: 13 },
    Corolla: { 2018: 12, 2020: 12, 2022: 12.5 },
    Hilux: { 2018: 9, 2020: 9, 2022: 9.5 },
  },
  Chevrolet: {
    Sail: { 2018: 14, 2019: 14, 2020: 14 },
    Spark: { 2018: 15, 2020: 15, 2021: 15 },
    Tracker: { 2020: 11.5, 2022: 11.5 },
  },
  Hyundai: {
    Accent: { 2018: 14, 2020: 14, 2022: 14.5 },
    Tucson: { 2018: 10.5, 2020: 10.5, 2022: 11 },
  },
  Kia: {
    Morning: { 2018: 16, 2020: 16, 2022: 16 },
    Rio: { 2018: 14.5, 2020: 14.5, 2022: 15 },
    Sportage: { 2020: 10.5, 2022: 11 },
  },
  Suzuki: {
    Swift: { 2018: 15, 2020: 15, 2022: 15.5 },
    Baleno: { 2018: 14.5, 2020: 14.5 },
  },
};

export function rendimientoDe(marca, modelo, anio) {
  return VEHICULOS[marca]?.[modelo]?.[anio] ?? null;
}
