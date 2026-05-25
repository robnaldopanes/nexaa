const fs = require('fs');

async function test() {
  const fetchFn = globalThis.fetch || fetch;
  console.log('--- TESTEANDO API DE ANUNCIOS ---');
  try {
    const res = await fetchFn('http://localhost:3001/api/ads');
    if (res.ok) {
      const data = await res.json();
      console.log('✓ Anuncios obtenidos de la BD:', data.length);
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('✗ Error al obtener anuncios:', res.status, await res.text());
    }
  } catch (err) {
    console.error('✗ Fallo de conexión con backend:', err.message);
  }

  console.log('\n--- TESTEANDO AUTO-SEMDER /api/ads/seed ---');
  try {
    const resSeed = await fetchFn('http://localhost:3001/api/ads/seed');
    if (resSeed.ok) {
      console.log('✓ Auto-seeder ejecutado con éxito:', await resSeed.json());
    } else {
      console.log('✗ Error en auto-seeder:', resSeed.status, await resSeed.json().catch(() => resSeed.text()));
    }
  } catch (err) {
    console.error('✗ Fallo de conexión con seeder:', err.message);
  }
}

test();
