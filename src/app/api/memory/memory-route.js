import { promises as fs } from 'fs';
import path from 'path';

// This loads your store directory from the JSON file
// It's the AI's "memory" — every salon number, address, entity, LED
let storeCache = null;

async function loadStores() {
  if (storeCache) return storeCache;
  const filePath = path.join(process.cwd(), 'data', 'store-memory.json');
  const raw = await fs.readFile(filePath, 'utf-8');
  storeCache = JSON.parse(raw);
  return storeCache;
}

export async function GET() {
  try {
    const stores = await loadStores();

    // Group by entity for the frontend
    const byEntity = {};
    stores.forEach(s => {
      if (!byEntity[s.entity]) byEntity[s.entity] = [];
      byEntity[s.entity].push(s);
    });

    return Response.json({
      success: true,
      totalStores: stores.length,
      entities: Object.keys(byEntity).sort(),
      byEntity,
      stores,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
