# Extracción de Facturas Electrónicas - DGI Panamá

Automatización con Playwright para descargar facturas electrónicas del portal DGI Panamá.

## Requisitos

- Node.js 16+
- npm

## Instalación

```bash
npm install
```

## Configuración

1. Copiar `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Editar `.env` y configurar las fechas:
```env
FECHA_EMISION_DESDE=01/01/2025
FECHA_EMISION_HASTA=31/03/2025
BASE_URL=https://dgi-fep.mef.gob.pa
```

**Nota:** El formato de las fechas debe ser `dd/mm/yyyy`.

## Uso

Ejecutar el scraper:
```bash
npm start
```

## Características

- ✓ Automatización completa del portal DGI Panamá
- ✓ División automática de rangos de fechas mayores a 3 meses en periodos de 3 meses
- ✓ Descarga de todos los PDFs CAFE
- ✓ Organización de descargas por fecha de ejecución
- ✓ Extracción automática de CUFE de la tabla de resultados
- ✓ Paginación automática

## Estructura de carpetas

- `descargas/[FECHA]/` - PDFs descargados, organizados por fecha de ejecución
- `scraper.js` - Script principal
- `.env` - Variables de entorno

## Notas

- Los archivos PDF se guardan con el nombre del CUFE para fácil identificación
- Cada ejecución crea una nueva carpeta con la fecha actual
- El rango de fechas se divide automáticamente si excede 3 meses
