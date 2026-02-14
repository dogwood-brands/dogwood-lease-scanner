// src/app/api/documents/route.js
// GET all documents (with optional filters), POST new document
import sql from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const leaseId = searchParams.get('lease_id');
    const docType = searchParams.get('doc_type');
    const unprocessed = searchParams.get('unprocessed');

    let query = `
      SELECT d.*, l.store_number, l.location_name, l.entity
      FROM documents d
      LEFT JOIN leases l ON l.id = d.lease_id
    `;

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (leaseId) {
      conditions.push(`d.lease_id = $${paramIndex++}`);
      params.push(leaseId);
    }
    if (docType) {
      conditions.push(`d.doc_type = $${paramIndex++}`);
      params.push(docType);
    }
    if (unprocessed === 'true') {
      conditions.push(`d.ocr_processed = false`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY d.created_at DESC';

    const documents = await sql(query, params);

    return Response.json({ documents, count: documents.length });
  } catch (error) {
    console.error('GET /api/documents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const result = await sql`
      INSERT INTO documents (
        lease_id, file_name, original_path, organized_path, file_size,
        doc_type, doc_date, confidence, ai_classification,
        ocr_text, ocr_processed, dropbox_link
      ) VALUES (
        ${body.lease_id}, ${body.file_name}, ${body.original_path}, 
        ${body.organized_path}, ${body.file_size},
        ${body.doc_type}, ${body.doc_date}, ${body.confidence}, 
        ${JSON.stringify(body.ai_classification || {})},
        ${body.ocr_text}, ${body.ocr_processed || false}, ${body.dropbox_link}
      )
      RETURNING *
    `;

    // If this document is an amendment, update the lease's latest_amendment
    if (body.lease_id && body.doc_type && body.doc_type.toLowerCase().includes('amendment')) {
      await sql`
        UPDATE leases 
        SET latest_amendment = ${body.doc_type},
            amendment_date = ${body.doc_date}
        WHERE id = ${body.lease_id}
      `;
    }

    return Response.json({ document: result[0] }, { status: 201 });
  } catch (error) {
    console.error('POST /api/documents error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
