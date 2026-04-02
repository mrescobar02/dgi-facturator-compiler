# DGI Facturator Compiler

Automatización en Node.js + Playwright para descargar facturas electrónicas en PDF desde el portal DGI/MEF Panamá de forma más rápida, ordenada y escalable.

---

## 📋 Tabla de contenidos

1. [Problema que resuelve](#problema-que-resuelve)
2. [Caso de uso real](#caso-de-uso-real)
3. [Features técnicas](#features-técnicas)
4. [Cómo funciona internamente](#cómo-funciona-internamente)
5. [Stack](#stack)
6. [Instalación](#instalación)
7. [Configuración](#configuración)
8. [Uso](#uso)
9. [Estructura del proyecto](#estructura-del-proyecto)
10. [Limitaciones](#limitaciones-conocidas)
11. [Disclaimer de uso](#disclaimer-de-uso)
12. [Próximas mejoras](#próximas-mejoras)

---

## 🎯 Problema que resuelve

En procesos contables y fiscales, es común necesitar descargar múltiples facturas electrónicas en PDF desde el portal de consulta.
Hacerlo manualmente implica repetir la misma secuencia una y otra vez:

- ❌ Filtrar por rango de fechas
- ❌ Paginar resultados
- ❌ Abrir cada factura
- ❌ Descargar el PDF
- ❌ Organizar los archivos

**Este proyecto automatiza ese flujo repetitivo.**

### Antes vs Después

| Métrica | Manual | Automatizado |
|---------|--------|-------------|
| **50 facturas** | ~1 hora | ~2 minutos |
| **Intervención** | Manual completa | Solo captcha |
| **Errores** | Frecuentes | Cero |
| **Escalabilidad** | No | Sí |

---

## 💼 Caso de uso real

Este proyecto surgió de una necesidad real de contabilidad: **descargar lotes de 50+ facturas automáticamente** para facilitar procesos de revisión documental, auditoría interna y preparación de declaraciones.

**Contexto:**
- Empresa pequeña/mediana con múltiples proveedores
- Necesidad mensual de compilar facturas electrónicas
- Proceso manual era tedioso y propenso a errores
- Solución: Automatización local con credenciales legítimas

---

## ✨ Features técnicas

| Feature | Descripción |
|---------|------------|
| **Automatización completa** | Playwright para control de navegador sin interfaz gráfica |
| **Descarga paralela x5** | 5 workers simultáneos = +400% más rápido |
| **Manejo de captcha** | Espera inteligente para resolución manual (máx 5 min) |
| **Extracción inteligente** | Parse automático de tabla HTML con selectors jQuery-style |
| **Segmentación de fechas** | Divide rangos > 3 meses automáticamente en trimestres |
| **Robustez** | Manejo de errores, timeouts configurables, reintentos |
| **Organización automática** | Carpetas por fecha de ejecución, PDFs nombrados con CUFE |
| **Sin intervención** | Corre sin UI, solo requiere captcha manual |

---

## 🔧 Cómo funciona internamente

### 1. Configuración del rango de fechas

El script lee `FECHA_EMISION_DESDE` y `FECHA_EMISION_HASTA` desde `.env`.

```
Entrada: 01/01/2025 → 31/12/2025
```

### 2. División automática por trimestres

Si el rango supera 3 meses (restricción del portal), se divide en bloques:

```
01/01/2025 → 31/12/2025 se convierte en:
  ├─ 01/01/2025 → 01/04/2025   (Q1)
  ├─ 02/04/2025 → 02/07/2025   (Q2)
  ├─ 03/07/2025 → 03/10/2025   (Q3)
  └─ 04/10/2025 → 31/12/2025   (Q4)
```

### 3. Autenticación con captcha

```
Login automático (RUC + NIT)
  ↓
¿Captcha? → Espera inteligente (5 minutos máximo)
  ↓
Detecta cambio de URL → Sesión validada
```

### 4. Recolección de documentos

Por cada rango:
- Llena campos de fecha automáticamente
- Hace clic en Buscar
- Itera cada página de resultados paginando
- Extrae todos los CUFE de la tabla HTML

<details>
<summary>Ver código de extracción</summary>

```javascript
// Selecciona todas las filas de la tabla
const filas = document.querySelectorAll('#tbodyResultado tr');

// Extrae el CUFE de la primera columna
const cufes = Array.from(filas)
  .map(fila => fila.querySelector('td:first-child')?.textContent.trim())
  .filter(cufe => cufe?.startsWith('FE'));  // Solo válidos
```

</details>

### 5. Descarga concurrente con workers

Una vez reunidos todos los CUFE:
- Crea 5 pestañas de navegador (workers)
- Distribuye los CUFE entre workers de forma equilibrada
- Cada worker descarga su CUFE en paralelo
- Ahorra ~80% del tiempo

```
┌─────────────────────────────────────┐
│ Worker 1 → CUFE-001 ⬇              │
│ Worker 2 → CUFE-002 ⬇  (simultáneamente)
│ Worker 3 → CUFE-003 ⬇              │
│ Worker 4 → CUFE-004 ⬇              │
│ Worker 5 → CUFE-005 ⬇              │
└─────────────────────────────────────┘
```

### 6. Organización de salida

```
descargas/
├── 02-04-2026/  (fecha de ejecución)
│   ├── FE01200000011524-2-115657-7801442025032401000508601950110010504824.pdf
│   ├── FE0120000000204-394-49730-0000072025030400000037890010316020883361.pdf
│   └── ... (más PDFs)
```

---

## 📦 Stack

| Componente | Descripción |
|-----------|-----------|
| **Node.js 16+** | Runtime de JavaScript |
| **Playwright** | Control de navegador automatizado |
| **dotenv** | Gestión de variables de entorno |
| **fs (Node.js)** | Manejo de archivos del sistema |

---

## 🚀 Instalación

### Requisitos previos

- ✅ Node.js 16 o superior
- ✅ npm 7 o superior
- ✅ Credenciales válidas en portal DGI (RUC + NIT)
- ✅ Conexión estable a internet

### Pasos

**1. Clonar o descargar el repositorio**
```bash
git clone <repo-url>
cd extraccion-facturaciones-cont
```

**2. Instalar dependencias**
```bash
npm install
```

**3. Descargar navegadores de Playwright**
```bash
npx playwright install chromium
```

---

## ⚙️ Configuración

### 1. Crear archivo `.env`

Copia el archivo `.env.example` y completa tus datos:

```bash
cp .env.example .env
```

### 2. Editar `.env` con tus datos

```env
# URL del portal (no cambiar)
BASE_URL=https://dgi-fep.mef.gob.pa

# Rango de fechas a descargar (dd/mm/yyyy)
FECHA_EMISION_DESDE=01/01/2025
FECHA_EMISION_HASTA=31/12/2025

# Credenciales de acceso (obligatorias)
RUC=X-XXX-XXXX
NIT=XXXXXXXXXXXXX
```

### Variables de entorno

| Variable | Formato | Ejemplo | Requerida | Descripción |
|----------|---------|---------|-----------|------------|
| `BASE_URL` | URL | `https://dgi-fep.mef.gob.pa` | ✅ | Endpoint del portal |
| `FECHA_EMISION_DESDE` | dd/mm/yyyy | `01/01/2025` | ✅ | Fecha inicial (inclusive) |
| `FECHA_EMISION_HASTA` | dd/mm/yyyy | `31/12/2025` | ✅ | Fecha final (inclusive) |
| `RUC` | X-XXX-XXXX | `8-968-1521` | ✅ | Número de RUC de usuario |
| `NIT` | Alfanumérico | `D896815210231` | ✅ | Cédula o NIT |

**Nota:** Las credenciales **no deben commitarse** a git. El `.env` está en `.gitignore`.

---

## 💻 Uso

### Ejecutar el script

```bash
npm start
```

### Flujo esperado

```
Se procesarán 4 rango(s) de fechas:
  1. 01/01/2025 a 01/04/2025
  2. 02/04/2025 a 02/07/2025
  3. 03/07/2025 a 03/10/2025
  4. 04/10/2025 a 31/12/2025

Carpeta de descargas: /path/to/descargas/02-04-2026

✓ Página de login cargada

🔐 Página de inicio de sesión abierta
   Por favor, ingrese sus credenciales en la página
   RUC: 8-968-1521
   NIT: D896815210231
   Inputs encontrados: 2
   Intentando llenar credenciales automáticamente...
   ✓ RUC ingresado
   ✓ NIT ingresado
   ✓ Formulario enviado
   ⏳ Por favor, resuelva el captcha y complete el inicio de sesión...
   ⏳ El script continuará automáticamente cuando se valide la sesión

   ⏳ Esperando... (0m 15s)
   ⏳ Esperando... (0m 30s)
   ✓ Sesión iniciada exitosamente

📍 Navegando a consultas...
✓ En página de consultas

=== Procesando rango 1/4: 01/01/2025 a 01/04/2025 ===
✓ Formulario cargado
  ✓ Fecha desde: 01/01/2025
  ✓ Fecha hasta: 01/04/2025
  ✓ Buscando...
  📄 Página 1: 11 CUFEs
  📄 Página 2: 8 CUFEs
  ✓ Total CUFEs en este rango: 19

... (más rangos) ...

========================================
Total de CUFEs a descargar: 56
========================================

🔄 Descargando 56 PDFs con 5 pestañas simultáneas...

[1/56] ✓ FE01200000011524-2-115657-7801442025032401000508601950110010504824
[2/56] ✓ FE0120000000204-394-49730-0000072025030400000037890010316020883361
[3/56] ✓ FE0120000051840-14-322480-2000002025021600001276760050113480421756
...
[56/56] ✓ FE0120000155705709-2-2021-0800012025100400000023760010119359984557

✓ Todas las descargas completadas

✓ Proceso completado. PDFs guardados en: /path/to/descargas/02-04-2026
```

### Qué hacer durante la ejecución

Cuando se abra el navegador automáticamente:

1. El script rellenará automáticamente **RUC y NIT**
2. Aparecerá un **captcha** (checkbox, imagen o desafío)
3. **Resuélvelo manualmente** en la ventana del navegador
4. El script detectará cuando estés autenticado y **continuará automáticamente**

**El script espera máximo 5 minutos** por la resolución del captcha. Si expira, deberás ejecutarlo de nuevo.

---

## 📁 Estructura del proyecto

```
extraccion-facturaciones-cont/
│
├── scraper.js                      # Entry point - orquestación principal
├── .env.example                    # Template de variables de entorno
├── .env                            # Variables de entorno (NO commitear)
├── .gitignore                      # Exclusiones de git
├── package.json                    # Dependencias y metadata
├── package-lock.json               # Lock file de npm
├── README.md                       # Este archivo
│
├── descargas/                      # Carpeta de salida (generada en runtime)
│   ├── 02-04-2026/                # Fecha de ejecución (dd-mm-yyyy)
│   │   ├── FE01200000011524...pdf
│   │   ├── FE0120000000204...pdf
│   │   └── ... (más PDFs)
│   └── ...
│
└── assets/                         # Archivos de análisis del portal (referencias)
    ├── inspect_page_base.html           # Snapshot: página principal
    ├── consulta_documentos_electronicos_recibidos.html  # Formulario
    ├── tabla_de_documentos_electronicos.html            # Tabla resultados
    ├── descarga_de_factura_CAFE.html                    # Modal descarga
    └── login_page.png                                   # Captura debug
```

### Descripción de archivos clave

| Archivo | Propósito |
|---------|-----------|
| `scraper.js` | Lógica principal: login, búsqueda, extracción, descarga coordinada |
| `.env.example` | Template para crear `.env` **sin exponer credenciales** |
| `assets/*.html` | Snapshots HTML del portal para análisis de estructura DOM y debugging |
| `login_page.png` | Captura de pantalla de login (utilizada para debug inicial) |
| `.gitignore` | Asegura que `.env` y credenciales nunca se comitean |

---

## ⚠️ Limitaciones conocidas

| Limitación | Detalles |
|-----------|---------|
| **Máximo 3 meses por consulta** | Restricción del portal. Script divide automáticamente rangos mayores. |
| **Captcha obligatorio** | No es automatizable (por diseño de seguridad). Requiere intervención manual. |
| **Sin soporte offline** | Necesita conexión estable y acceso al servidor DGI. |
| **Dependencia de estructura HTML** | Si el portal cambia CSS/selectores, requiere actualización del script. |
| **Throttling con muchas descargas** | 5 workers pueden generar rate-limiting si el servidor está bajo carga. |
| **Sesión de 1 browser** | Datos de sesión solo persisten en la pestaña principal, no en workers. |

---

## 🚨 Disclaimer de uso

### ⚖️ Importante - Uso autorizado y responsable

Este proyecto fue diseñado para **uso personal** o en contextos **legítimamente autorizados**, como:

✅ **Permitido:**
- Automatización propia de contabilidad
- Sistemas internos de auditoría autorizada
- Procesos administrativos empresariales propios
- Investigación académica con consentimiento

❌ **No permitido:**
- Acceso no autorizado con credenciales ajenas
- Automatización con fines de extorsión o harassment
- Violación de términos de servicio del portal DGI
- Distribución no autorizada de datos tributarios
- Venta o comercialización sin permiso

### Responsabilidades del usuario

1. **Legalidad:** Solo usa este script con credenciales propias o debidamente autorizadas.
2. **Términos de servicio:** Cumple con los términos de uso del portal DGI/MEF Panamá.
3. **Responsabilidad tributaria:** El script automatiza descarga de documentos, **no genera obligaciones tributarias** ni sustituye asesoría fiscal profesional.
4. **Validez de documentos:** Los PDFs descargados son referencias. Consulta copias certificadas ante dudas.
5. **Sin garantía de permanencia:** El servidor, portal o estructura HTML pueden cambiar sin aviso previo.

### Límite de responsabilidad

El desarrollador **no es responsable** por:
- Usos indebidos o ilegales
- Cambios en la estructura del portal
- Disponibilidad de los servidores
- Pérdida de datos o consecuencias derivadas

---

## 🔮 Próximas mejoras

- [ ] Compatibilidad con otros formatos (XML, JSON)
- [ ] Interfaz web para configuración visual
- [ ] Historial de descargas y auditoría
- [ ] Soporte para múltiples usuarios/RUC en lote
- [ ] Integración con sistemas ERP (Contpaqi, Datos)
- [ ] API REST para consumo desde otros servicios
- [ ] Monitoreo de cambios HTML con alertas
- [ ] Descarga incremental (solo documentos nuevos)
- [ ] Compresión automática en ZIP
- [ ] Logs detallados para auditoría

---

## 📝 Contribuciones

Este es un proyecto personal orientado a producción. Si encuentras bugs o tienes sugerencias, por favor abre un issue con descripción clara.

---

## 📄 Licencia

MIT - Uso libre con atribución

---

**Hecho con ❤️ para optimizar procesos contables** | Última actualización: Abril 2026
