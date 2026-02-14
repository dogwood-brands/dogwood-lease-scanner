// src/app/api/db/seed/route.js
// Import your 58-store directory from store-memory.json into the database
// Run once after initializing the database
import sql from '@/lib/db';
import storeMemory from '@/../data/store-memory.json';

export async function POST() {
  try {
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const store of storeMemory.stores || storeMemory) {
      try {
        // Check if this store already exists
        const existing = await sql`
          SELECT id FROM leases 
          WHERE store_number = ${store.store_number || store.storeNumber}
          LIMIT 1
        `;

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // Parse the address into components
        const fullAddress = store.address || '';
        const addressParts = fullAddress.split(',').map(s => s.trim());
        const stateZip = (addressParts[addressParts.length - 1] || '').split(' ');
        
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
            status
          ) VALUES (
            ${store.store_number || store.storeNumber},
            ${store.location_name || store.name || store.store_name},
            ${store.salon_number || store.salonNumber},
            ${store.address},
            ${store.city || addressParts[1] || null},
            ${store.state || (stateZip.length >= 2 ? stateZip[0] : null)},
            ${store.zip || (stateZip.length >= 2 ? stateZip[1] : null)},
            ${store.shopping_center || store.shoppingCenter},
            ${store.market},
            ${store.entity},
            ${store.led_date || store.led || null},
            ${store.annual_sales_2024 || store.sales_2024 || null},
            'active'
          )
        `;

        imported++;
      } catch (storeError) {
        errors.push({ store: store.store_number, error: storeError.message });
      }
    }

    // Get final count
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
