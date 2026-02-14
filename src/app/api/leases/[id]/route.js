// src/app/api/leases/[id]/route.js
// GET, PUT, DELETE a single lease by ID
import sql from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const leases = await sql`
      SELECT * FROM leases WHERE id = ${id}
    `;

    if (leases.length === 0) {
      return Response.json({ error: 'Lease not found' }, { status: 404 });
    }

    // Also get all documents for this lease
    const documents = await sql`
      SELECT * FROM documents 
      WHERE lease_id = ${id} 
      ORDER BY doc_date DESC, created_at DESC
    `;

    return Response.json({ lease: leases[0], documents });
  } catch (error) {
    console.error('GET /api/leases/[id] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Build dynamic update query from provided fields
    const allowedFields = [
      'store_number', 'location_name', 'salon_number',
      'address', 'city', 'state', 'zip',
      'shopping_center', 'market', 'entity',
      'landlord', 'landlord_contact', 'landlord_email', 'landlord_phone',
      'lease_start', 'lease_end',
      'monthly_rent', 'monthly_cam', 'sqft', 'rent_per_sqft',
      'latest_amendment', 'amendment_date', 'renewal_options',
      'led_date', 'annual_sales_2024',
      'status', 'key_terms', 'notes', 'dropbox_folder'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id);
    const query = `
      UPDATE leases 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await sql(query, values);

    if (result.length === 0) {
      return Response.json({ error: 'Lease not found' }, { status: 404 });
    }

    return Response.json({ lease: result[0] });
  } catch (error) {
    console.error('PUT /api/leases/[id] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const result = await sql`
      DELETE FROM leases WHERE id = ${id} RETURNING id
    `;

    if (result.length === 0) {
      return Response.json({ error: 'Lease not found' }, { status: 404 });
    }

    return Response.json({ deleted: true, id: result[0].id });
  } catch (error) {
    console.error('DELETE /api/leases/[id] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
