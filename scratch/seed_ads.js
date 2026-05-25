const fs = require('fs');
const path = require('path');

async function seed() {
  const apiUrl = 'http://localhost:3001';
  const brainDir = 'C:\\Users\\damian\\.gemini\\antigravity\\brain\\4be8ff7f-2741-425a-aeaf-0f5191ae86c7';

  // Find files in brainDir matching the generated patterns
  const files = fs.readdirSync(brainDir);
  const principalFile = files.find(f => f.startsWith('nexaa_banner_principal_') && f.endsWith('.png'));
  const lateralFile = files.find(f => f.startsWith('nexaa_banner_lateral_') && f.endsWith('.png'));
  const noticiasFile = files.find(f => f.startsWith('nexaa_banner_noticias_') && f.endsWith('.png'));

  if (!principalFile || !lateralFile || !noticiasFile) {
    console.error('Error: No se encontraron los archivos de imagen generados.');
    console.log('Archivos disponibles:', files.filter(f => f.endsWith('.png')));
    return;
  }

  const adsToSeed = [
    {
      name: 'Promoción NEXAA - Banner Principal',
      location: 'Banner Principal',
      fileName: principalFile,
      link_url: 'https://nexaa.vercel.app/publicidad'
    },
    {
      name: 'Promoción NEXAA - Barra Lateral',
      location: 'Barra lateral',
      fileName: lateralFile,
      link_url: 'https://nexaa.vercel.app/publicidad'
    },
    {
      name: 'Promoción NEXAA - Entre Noticias',
      location: 'Entre noticias',
      fileName: noticiasFile,
      link_url: 'https://nexaa.vercel.app/publicidad'
    }
  ];

  const fetchFn = globalThis.fetch || fetch;

  for (const adSpec of adsToSeed) {
    const filePath = path.join(brainDir, adSpec.fileName);
    console.log(`Leyendo imagen: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

    const adBody = {
      name: adSpec.name,
      location: adSpec.location,
      image_url: base64,
      link_url: adSpec.link_url,
      is_active: true,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    console.log(`Registrando anuncio '${adSpec.name}' en la base de datos...`);
    try {
      const res = await fetchFn(`${apiUrl}/api/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adBody)
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`✓ Anuncio '${adSpec.name}' registrado exitosamente con ID: ${data.id}`);
      } else {
        const errText = await res.text();
        console.error(`✗ Error al registrar '${adSpec.name}':`, errText);
      }
    } catch (err) {
      console.error(`✗ Error de conexión para '${adSpec.name}':`, err.message);
    }
  }
}

seed();
