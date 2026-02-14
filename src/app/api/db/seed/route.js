// src/app/api/db/seed/route.js
// Import your 58-store directory from store-memory.json into the database
import sql from '@/lib/db';
import storeMemory from '../../.././../../data/store-memory.json';

export async function POST() {
  try {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const store of storeMemory) {
      try {
        const storeNum = String(store.salon_number);

        // Check if this store already exists
        const existing = await sql`
          SELECT id FROM leases 
          WHERE salon_number = ${storeNum}
          LIMIT 1
        `;

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        await sql`
          INSERT INTO leases (
            store_number,
            location_name,
            salon_number,
            address,
            city,
            state,
            zip,
            shopping_center,
            market,
            entity,
            led_date,
            annual_sales_2024,
            status,
            notes
          ) VALUES (
            ${store.internal_name || storeNum},
            ${store.store_name ? (store.concept || 'SUPERCUTS') + ' - ' + store.store_name : null},
            ${storeNum},
            ${store.address},
            ${store.city},
            ${store.state},
            ${store.zip},
            ${store.shopping_center},
            ${store.state === 'NV' ? 'Las Vegas' : store.state === 'AZ' ? 'Phoenix' : 'Southern California'},
            ${store.entity},
            ${store.led || null},
            ${store.sales_2024 || null},
            'active',
            ${store.phone ? 'Phone: ' + store.phone : null}
          )
        `;

        imported++;
      } catch (storeError) {
        errors.push({ store: store.salon_number, error: storeError.message });
      }
    }

    const count = await sql`SELECT COUNT(*) AS total FROM leases`;

    return Response.json({
      success: true,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      totalInDatabase: count[0].total
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
