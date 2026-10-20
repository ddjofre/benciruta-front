# BenciRuta – Frontend

Aplicación web *mobile-first* que ayuda a elegir la bencinera más conveniente en **Ñuñoa**. Muestra un mapa a pantalla completa y, en un panel inferior, deja ingresar los datos del vehículo, el combustible y la carga. Luego recomienda la estación con menor **costo total** (combustible + traslado) y traza la ruta hasta ella.

Los datos de estaciones y los costos los entrega el backend ([benciruta-backend](https://github.com/YCardoen/benciruta-backend)).

## Stack

- [Next.js](https://nextjs.org) (App Router) + React, en JavaScript
- [Tailwind CSS](https://tailwindcss.com) para los estilos
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) para el mapa
- API del navegador para la geolocalización

## Requisitos

- Node.js compatible con tu versión de Next.js (20.9 o superior)
- El **backend corriendo** (por defecto en `http://localhost:4000`)
- Un **token público de Mapbox** (`pk...`) de https://account.mapbox.com

## Instalación y ejecución

```bash
npm install
cp .env.local.example .env.local     # en Windows: Copy-Item .env.local.example .env.local
# edita .env.local y pega tu token de Mapbox
npm run dev
```

Abre http://localhost:3000. Si cambias `.env.local`, reinicia `npm run dev`.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila para producción |
| `npm start` | Sirve la versión compilada |

### Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Token público de Mapbox. Sin él el mapa no carga y se muestra un aviso. |
| `NEXT_PUBLIC_API_URL` | Dirección del backend. Por defecto `http://localhost:4000`. |

Las variables `NEXT_PUBLIC_*` quedan visibles en el navegador. Usa solo un token **público** de Mapbox y no pongas aquí claves privadas. `.env.local` está en `.gitignore`.

## Cómo se usa

1. Al cargar, la app pide tu ubicación. Si no se concede, aparece una alerta para ingresar una dirección o elegir un punto en el mapa.
2. Define el **origen**: escribe una dirección en la barra superior (elige una sugerencia o presiona Enter), toca el mapa, arrastra el punto azul o usa el botón ◎.
3. En el panel inferior ajusta los cuatro bloques:
   - **Datos del vehículo:** marca, modelo, año y rendimiento (1 a 50 km/l; 10 por defecto).
   - **Tipo de combustible:** 93, 95 (por defecto), 97 o diésel.
   - **Volumen de carga:** monto en pesos o litros (30 L por defecto), con botones rápidos.
   - **Radio de búsqueda:** de 1 a 20 km (5 por defecto). Se dibuja como un círculo azul en el mapa.
4. Presiona **Buscar mejor opción**.
5. Aparece la **estación recomendada** y las demás ordenadas por costo total. **Ver ruta** dibuja el camino en el mapa y baja el panel.
6. **Modificar búsqueda** (arriba del panel) vuelve al formulario con tus valores. **Volver a resultados** regresa a la lista sin buscar de nuevo.

El panel tiene 3 estados (minimizado, medio y expandido): se arrastra o se toca la barra gris de su borde superior.

## Cómo se conecta

### Con el backend

| Acción | Endpoint | Qué se usa |
|---|---|---|
| Buscar mejor opción | `GET /api/combustibles/estaciones-cercanas` | Posición, marca, comuna y precio de las estaciones; precio promedio |
| Buscar mejor opción | `POST /api/combustibles/calcular` | Costos de carga y traslado, total, ahorro y orden del ranking |

Cada búsqueda hace ambas llamadas. `/calcular` no devuelve coordenadas, así que el front las toma de `/estaciones-cercanas` cruzando por `id`.

### Con servicios externos

| Servicio | Uso |
|---|---|
| Mapbox GL | Mapa, marcadores y círculo de radio |
| Mapbox Search Box | Autocompletado de direcciones y su ubicación exacta |
| Mapbox Geocoding | Dirección de un punto tocado en el mapa |
| Mapbox Directions | Línea de la ruta en "Ver ruta" |
| Geolocalización del navegador | Ubicación inicial y botón ◎ |


## Estructura

```
app/
├── layout.js              # Estructura HTML, título y viewport
├── page.js                # Pantalla única: estado y flujo de la aplicación
└── globals.css            # Tailwind y estilos base
components/
├── MapView.js             # Mapa: origen, radio, estaciones y ruta
├── SearchBar.js           # Barra de dirección con autocompletado
├── BottomSheet.js         # Panel deslizable de 3 estados
├── ParamsPanel.js         # Formulario de parámetros (4 bloques)
├── Resultados.js          # Recomendación y lista de alternativas
└── Modal.js               # Alertas emergentes
lib/
├── api.js                 # Llamadas al backend y a Mapbox
├── config.js              # Constantes: cobertura, valores por defecto, combustibles
├── format.js              # Formato de pesos, kilómetros y miles
└── vehiculos.js           # Catálogo de vehículos (de ejemplo)
```

## Datos de ejemplo (no reales)

`lib/vehiculos.js` es un catálogo de pocas marcas con rendimientos **aproximados** puestos a mano. No viene de ninguna fuente oficial. También están escritos en el código la lista de combustibles y el límite de Ñuñoa.


