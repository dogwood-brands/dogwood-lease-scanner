// src/app/api/leases/route.js
// GET all leases, POST new lease
import sql from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const status = searchParams.get('status');
    const market = searchParams.get('market');
    const search = searchParams.get('search');

    let query = `
      SELECT l.*, 
        COUNT(d.id) AS document_count,
        MAX(d.created_at) AS last_doc_added
      FROM leases l
      LEFT JOIN documents d ON d.lease_id = l.id
    `;
    
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (entity) {
      conditions.push(`l.entity = $${paramIndex++}`);
      params.push(entity);
    }
    if (status) {
      conditions.push(`l.status = $${paramIndex++}`);
      params.push(status);
    }
    if (market) {
      conditions.push(`l.market = $${paramIndex++}`);
      params.push(market);
    }
    if (search) {
      conditions.push(`(
        l.store_number ILIKE $${paramIndex} OR 
        l.location_name ILIKE $${paramIndex} OR 
        l.address ILIKE $${paramIndex} OR 
        l.landlord ILIKE $${paramIndex} OR
        l.shopping_center ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY l.id ORDER BY l.entity, l.store_number';

    const leases = await sql(query, params);

    return Response.json({ leases, count: leases.length });
  } catch (error) {
    console.error('GET /api/leases error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const result = await sql`
      INSERT INTO leases (
        store_number, location_name, salon_number,
        address, city, state, zip,
        shopping_center, market, entity,
        landlord, landlord_contact, landlord_email, landlord_phone,
        lease_start, lease_end,
        monthly_rent, monthly_cam, sqft, rent_per_sqft,
        latest_amendment, amendment_date, renewal_options,
        led_date, annual_sales_2024,
        status, key_terms, notes, dropbox_folder
      ) VALUES (
        ${body.store_number}, ${body.location_name}, ${body.salon_number},
        ${body.address}, ${body.city}, ${body.state}, ${body.zip},
        ${body.shopping_center}, ${body.market}, ${body.entity},
        ${body.landlord}, ${body.landlord_contact}, ${body.landlord_email}, ${body.landlord_phone},
        ${body.lease_start}, ${body.lease_end},
        ${body.monthly_rent}, ${body.monthly_cam}, ${body.sqft}, ${body.rent_per_sqft},
        ${body.latest_amendment}, ${body.amendment_date}, ${body.renewal_options},
        ${body.led_date}, ${body.annual_sales_2024},
        ${body.status || 'active'}, ${body.key_terms}, ${body.notes}, ${body.dropbox_folder}
      )
      RETURNING *
    `;

    return Response.json({ lease: result[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/leases error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
