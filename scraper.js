const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function addMonths(date, months) {
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + months);
  return newDate;
}

function getMonthsDifference(date1, date2) {
  return (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth());
}

async function hacerLogin(page, ruc, nit, baseUrl) {
  console.log('🔐 Página de inicio de sesión abierta');
  console.log('   Por favor, ingrese sus credenciales en la página');
  console.log('   RUC: ' + ruc);
  console.log('   NIT: ' + nit);

  await page.waitForTimeout(2000);

  const inputs = await page.evaluate(() => {
    const allInputs = document.querySelectorAll('input');
    const info = [];
    allInputs.forEach((inp, idx) => {
      if (inp.offsetParent !== null) {
        info.push({
          idx,
          id: inp.id,
          name: inp.name,
          type: inp.type,
          placeholder: inp.placeholder
        });
      }
    });
    return info;
  });

  console.log(`   Inputs encontrados: ${inputs.length}`);

  let loginAutomatico = false;

  if (inputs.length >= 2) {
    try {
      console.log('   Intentando llenar credenciales automáticamente...');

      const primerInput = inputs.find(i => i.type === 'text');
      if (primerInput) {
        await page.evaluate(({ id, ruc }) => {
          const campo = document.getElementById(id);
          if (campo) {
            campo.value = ruc;
            campo.dispatchEvent(new Event('input', { bubbles: true }));
            campo.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, { id: primerInput.id, ruc });
        console.log(`   ✓ RUC ingresado`);
      }

      const segundoInput = inputs.find(i => i.type === 'password');
      if (segundoInput) {
        await page.evaluate(({ id, nit }) => {
          const campo = document.getElementById(id);
          if (campo) {
            campo.value = nit;
            campo.dispatchEvent(new Event('input', { bubbles: true }));
            campo.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, { id: segundoInput.id, nit });
        console.log(`   ✓ NIT ingresado`);
      }

      const botonSubmit = await page.$('button[type="submit"], input[type="submit"]');
      if (botonSubmit) {
        await botonSubmit.click();
        console.log('   ✓ Formulario enviado');
        loginAutomatico = true;

        try {
          await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
        } catch (e) {
          console.log('   ⚠ No se detectó navegación, continuando...');
        }

        await page.waitForTimeout(3000);

        const currentUrl = page.url();
        if (currentUrl.includes('LoginFEP') || currentUrl.includes('Login')) {
          console.log('   ⚠ Parece que el login no fue exitoso, la página sigue en login');
          loginAutomatico = false;
        } else {
          console.log('   ✓ Sesión iniciada exitosamente');
        }
      }
    } catch (e) {
      console.log(`   ⚠ No se pudo llenar automáticamente: ${e.message}`);
      loginAutomatico = false;
    }
  }

  if (!loginAutomatico) {
    console.log('   ⏳ Por favor, resuelva el captcha y complete el inicio de sesión...');
    console.log('   ⏳ El script continuará automáticamente cuando se valide la sesión\n');

    let sesionExitosa = false;

    for (let i = 0; i < 300; i++) {
      try {
        const currentUrl = page.url();

        if (!currentUrl.includes('LoginFEP') && !currentUrl.includes('Login')) {
          sesionExitosa = true;
          console.log('   ✓ Sesión iniciada exitosamente\n');
          break;
        }

        await page.waitForTimeout(1000);

        if ((i + 1) % 15 === 0) {
          const minutos = Math.floor((i + 1) / 60);
          const segundos = (i + 1) % 60;
          console.log(`   ⏳ Esperando... (${minutos}m ${segundos}s)`);
        }
      } catch (err) {
        if (err.message.includes('closed')) {
          break;
        }
      }
    }

    if (!sesionExitosa) {
      console.log('   ⚠ Tiempo de espera agotado (5 minutos). Por favor, inicie sesión manualmente y ejecute de nuevo.');
      try {
        await page.waitForTimeout(5000);
      } catch (e) {}
    }
  }

  return true;
}

function dividirRangoFechas(fechaDesde, fechaHasta) {
  const dateStart = parseDate(fechaDesde);
  const dateEnd = parseDate(fechaHasta);

  const monthsDiff = getMonthsDifference(dateStart, dateEnd);

  if (monthsDiff <= 3) {
    return [[fechaDesde, fechaHasta]];
  }

  const rangos = [];
  let currentStart = new Date(dateStart);

  while (currentStart < dateEnd) {
    let currentEnd = addMonths(currentStart, 3);

    if (currentEnd > dateEnd) {
      currentEnd = new Date(dateEnd);
    }

    rangos.push([formatDate(currentStart), formatDate(currentEnd)]);
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentStart.getDate() + 1);
  }

  return rangos;
}

function crearCarpetaDescargas() {
  const today = new Date();
  const fecha = formatDate(today).replace(/\//g, '-');
  const carpeta = path.join(__dirname, 'descargas', fecha);

  if (!fs.existsSync(carpeta)) {
    fs.mkdirSync(carpeta, { recursive: true });
  }

  return carpeta;
}

async function ejecutarUltima() {
  const browser = await chromium.launch({ headless: false, slowMo: 100 });
  const context = await browser.newContext({
    acceptDownloads: true,
  });
  const page = await context.newPage();

  const baseUrl = process.env.BASE_URL || 'https://dgi-fep.mef.gob.pa';
  const fechaDesde = process.env.FECHA_EMISION_DESDE;
  const fechaHasta = process.env.FECHA_EMISION_HASTA;
  const ruc = process.env.RUC;
  const nit = process.env.NIT;

  if (!fechaDesde || !fechaHasta) {
    console.error('Error: FECHA_EMISION_DESDE y FECHA_EMISION_HASTA son requeridos en .env');
    await browser.close();
    return;
  }

  if (!ruc || !nit) {
    console.error('Error: RUC y NIT son requeridos en .env');
    await browser.close();
    return;
  }

  const rangos = dividirRangoFechas(fechaDesde, fechaHasta);
  console.log(`Se procesarán ${rangos.length} rango(s) de fechas:`);
  rangos.forEach((r, i) => console.log(`  ${i + 1}. ${r[0]} a ${r[1]}`));

  const carpetaDescargas = crearCarpetaDescargas();
  console.log(`\nCarpeta de descargas: ${carpetaDescargas}\n`);

  const todosLosCufes = [];

  try {
    await page.goto(`${baseUrl}/Sesion/LoginFEP`, { waitUntil: 'networkidle' });
    console.log('✓ Página de login cargada\n');

    if (ruc && nit) {
      await hacerLogin(page, ruc, nit, baseUrl);
      console.log('');
    }

    console.log('📍 Navegando a consultas...');
    await page.goto(`${baseUrl}/Consultas/DocumentosElectrónicosRecibidos`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(2000);
    console.log('✓ En página de consultas\n');

    for (let i = 0; i < rangos.length; i++) {
      const [fechaI, fechaF] = rangos[i];
      console.log(`\n=== Procesando rango ${i + 1}/${rangos.length}: ${fechaI} a ${fechaF} ===`);

      try {
        await page.waitForSelector('#FechaEmisionDesde', { timeout: 30000 });
      } catch (e) {
        console.error('⚠ Campo FechaEmisionDesde no encontrado');
        const title = await page.title();
        const url = page.url();
        console.error(`Página actual: ${title} (${url})`);
        continue;
      }

      await page.waitForSelector('#FechaEmisionHasta', { timeout: 10000 });
      console.log('✓ Formulario cargado');

      await page.evaluate((fecha) => {
        const campo = document.getElementById('FechaEmisionDesde');
        if (campo) {
          campo.value = fecha;
          campo.dispatchEvent(new Event('input', { bubbles: true }));
          campo.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, fechaI);
      console.log(`  ✓ Fecha desde: ${fechaI}`);

      await page.evaluate((fecha) => {
        const campo = document.getElementById('FechaEmisionHasta');
        if (campo) {
          campo.value = fecha;
          campo.dispatchEvent(new Event('input', { bubbles: true }));
          campo.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, fechaF);
      console.log(`  ✓ Fecha hasta: ${fechaF}`);

      try {
        await page.evaluate(() => {
          const botones = Array.from(document.querySelectorAll('button'));
          const boton = botones.find(b => b.textContent.includes('Buscar'));
          if (boton) boton.click();
        });
        console.log('  ✓ Buscando...');
      } catch (error) {
        console.log(`  ⚠ Error al hacer clic en Buscar: ${error.message}`);
        continue;
      }

      await page.waitForTimeout(3000);

      const errorMsg = await page.$('#mensajeError');
      if (errorMsg) {
        const error = await errorMsg.textContent();
        if (error && error.trim()) {
          console.log(`  ⚠ Error en búsqueda: ${error.trim()}`);
          continue;
        }
      }

      let todosLosCufesRango = [];
      let pagina = 1;

      while (true) {
        const cufes = await page.evaluate(() => {
          const filas = document.querySelectorAll('#tbodyResultado tr');
          const cufes = [];
          filas.forEach(fila => {
            const celdaCufe = fila.querySelector('td:first-child');
            if (celdaCufe) {
              const cufe = celdaCufe.textContent.trim();
              if (cufe && cufe.startsWith('FE')) {
                cufes.push(cufe);
              }
            }
          });
          return cufes;
        });

        todosLosCufesRango.push(...cufes);
        console.log(`  📄 Página ${pagina}: ${cufes.length} CUFEs`);

        const tieneSiguiente = await page.evaluate(() => {
          const enlaces = document.querySelectorAll('ul.pagination a');
          const paginaActual = document.querySelector('ul.pagination li.active');
          for (let enlace of enlaces) {
            if (enlace.textContent.trim() === '»') {
              const li = enlace.closest('li');
              return !li.classList.contains('disabled');
            }
          }
          return false;
        });

        if (!tieneSiguiente) {
          break;
        }

        try {
          const clickRealizado = await page.evaluate(() => {
            const enlaces = document.querySelectorAll('ul.pagination a');
            for (let enlace of enlaces) {
              if (enlace.textContent.trim() === '»') {
                const li = enlace.closest('li');
                if (li && !li.classList.contains('disabled')) {
                  enlace.click();
                  return true;
                }
              }
            }
            return false;
          });

          if (!clickRealizado) {
            console.log(`  ℹ️ No se encontró botón siguiente activo`);
            break;
          }

          await page.waitForTimeout(1500);
          pagina++;
        } catch (error) {
          console.log(`  ⚠ Error al pasar a siguiente página: ${error.message}`);
          break;
        }
      }

      todosLosCufes.push(...todosLosCufesRango);
      console.log(`  ✓ Total CUFEs en este rango: ${todosLosCufesRango.length}`);
    }

    console.log(`\n========================================`);
    console.log(`Total de CUFEs a descargar: ${todosLosCufes.length}`);
    console.log(`========================================\n`);

    const NUM_WORKERS = 5;
    let indiceActual = 0;
    let descargasFinalizadas = 0;

    async function descargarCufe(pageWorker, cufe, numero, total) {
      try {
        const url = `${baseUrl}/Consultas/ConsultarFacturaElectronicaPorCUFE/${encodeURIComponent(cufe)}`;
        await pageWorker.goto(url, { waitUntil: 'networkidle' });

        const downloadPromise = pageWorker.waitForEvent('download');

        await pageWorker.evaluate(() => {
          const botones = document.querySelectorAll('a.btn-primary, button.btn-primary');
          for (let boton of botones) {
            if (boton.textContent.includes('Descargar CAFE')) {
              boton.click();
              break;
            }
          }
        });

        const download = await downloadPromise;
        const nombreArchivo = `${cufe}.pdf`;
        const rutaArchivo = path.join(carpetaDescargas, nombreArchivo);

        await download.saveAs(rutaArchivo);
        console.log(`[${numero}/${total}] ✓ ${cufe}`);
        return true;
      } catch (error) {
        console.log(`[${numero}/${total}] ✗ ${cufe}: ${error.message}`);
        return false;
      }
    }

    const workers = [];
    for (let i = 0; i < NUM_WORKERS; i++) {
      const newPage = await context.newPage();
      workers.push(newPage);
    }

    async function procesarCufes() {
      const tareas = [];

      for (let i = 0; i < workers.length; i++) {
        const tarea = (async () => {
          while (indiceActual < todosLosCufes.length) {
            const idx = indiceActual;
            indiceActual++;

            const cufe = todosLosCufes[idx];
            const numero = idx + 1;

            await descargarCufe(workers[i], cufe, numero, todosLosCufes.length);
            descargasFinalizadas++;
          }
        })();
        tareas.push(tarea);
      }

      await Promise.all(tareas);
    }

    console.log(`🔄 Descargando ${todosLosCufes.length} PDFs con ${NUM_WORKERS} pestañas simultáneas...\n`);
    await procesarCufes();

    for (const w of workers) {
      await w.close();
    }

    console.log(`\n✓ Todas las descargas completadas`);

    console.log(`\n✓ Proceso completado. PDFs guardados en: ${carpetaDescargas}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await context.close();
    await browser.close();
  }
}

ejecutarUltima();
