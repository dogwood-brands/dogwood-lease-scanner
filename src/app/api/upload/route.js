// src/app/api/upload/route.js
// Full pipeline: receive file → OCR → AI classify → save to Neon Postgres
import sql from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── OCR using Google Document AI ───
async function ocrDocument(fileBuffer, fileName) {
  const { DocumentProcessorServiceClient } = await import('@google-cloud/documentai');
  
  let clientOptions = {};
  
  // Handle Google credentials
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    clientOptions = { credentials };
  } else if (process.env.GOOGLE_CREDENTIALS) {
    // Local file path
    clientOptions = { keyFilename: process.env.GOOGLE_CREDENTIALS };
  }

  const client = new DocumentProcessorServiceClient(clientOptions);
  
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const location = 'us'; 
  const processorId = process.env.GOOGLE_PROCESSOR_ID;
  const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;

  const encodedFile = fileBuffer.toString('base64');
  const mimeType = fileName.toLowerCase().endsWith('.pdf') 
    ? 'application/pdf' 
    : fileName.toLowerCase().endsWith('.png') ? 'image/png'
    : fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg') ? 'image/jpeg'
    : 'application/pdf';

  const [result] = await client.processDocument({
    name,
    rawDocument: {
      content: encodedFile,
      mimeType,
    },
  });

  return result.document?.text || '';
}

// ─── AI Classification ───
async function classifyDocument(ocrText, fileName) {
  // Load store memory for matching
  let storeMemory = [];
  try {
    const res = await fetch(new URL('/api/memory', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'));
    if (res.ok) {
      const data = await res.json();
      storeMemory = data.stores || [];
    }
  } catch (e) {
    // If memory API fails, try loading from DB
    try {
      storeMemory = await sql`SELECT salon_number, store_number, location_name, address, city, state, zip, entity, shopping_center FROM leases LIMIT 100`;
    } catch (e2) {
      console.log('Could not load store memory, proceeding without it');
    }
  }

  const systemPrompt = `You are a real estate document classifier for Dogwood Brands, a private equity company that operates Supercuts and SmartStyle salon locations.

Given OCR text from a document, classify it and extract key information.

STORE DIRECTORY (use this to match documents to locations):
${JSON.stringify(storeMemory.slice(0, 60), null, 2)}

Respond in JSON only, no markdown backticks:
{
  "document_type": "Original Lease | Amendment #N | Estoppel Certificate | LOI | Lease Abstract | Rent Schedule | CAM Reconciliation | Termination Notice | Renewal Notice | Correspondence | Insurance Certificate | Other",
  "entity": "entity code like SC-31, SD-06, LV-14, EE-1, PHX-06, SC-3",
  "store_number": "internal_name if found",
  "salon_number": "salon number if found (numeric)",
  "property_address": "full address if found",
  "city": "city",
  "state": "state abbreviation",
  "zip": "zip code",
  "shopping_center": "shopping center name if found",
  "landlord": "landlord name if found",
  "landlord_contact": "landlord contact info if found",
  "document_date": "YYYY-MM-DD if found, null otherwise",
  "lease_start": "YYYY-MM-DD if found",
  "lease_end": "YYYY-MM-DD if found",
  "monthly_rent": null or number,
  "sqft": null or number,
  "key_terms": "brief summary of notable terms",
  "confidence": 0-100
}`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Classify this document.\n\nFile name: ${fileName}\n\nOCR Text (first 4000 chars):\n${(ocrText || '').substring(0, 4000)}`
    }]
  });

  const responseText = message.content[0].text;
  try {
    return JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
  } catch {
    return { document_type: 'Unknown', confidence: 0, raw: responseText };
  }
}

// ─── Find or create lease in DB ───
async function findOrCreateLease(classification) {
  let leaseId = null;

  // Try matching by salon number
  if (classification.salon_number) {
    const existing = await sql`
      SELECT id FROM leases WHERE salon_number = ${String(classification.salon_number)} LIMIT 1
    `;
    if (existing.length > 0) leaseId = existing[0].id;
  }

  // Try matching by address
  if (!leaseId && classification.property_address) {
    const existing = await sql`
      SELECT id FROM leases WHERE address ILIKE ${`%${classification.property_address.substring(0, 30)}%`} LIMIT 1
    `;
    if (existing.length > 0) leaseId = existing[0].id;
  }

  // Try matching by shopping center
  if (!leaseId && classification.shopping_center) {
    const existing = await sql`
      SELECT id FROM leases WHERE shopping_center ILIKE ${`%${classification.shopping_center}%`} LIMIT 1
    `;
    if (existing.length > 0) leaseId = existing[0].id;
  }

  // Create new lease if not found and we have enough info
  if (!leaseId && classification.document_type !== 'Unknown') {
    try {
      const newLease = await sql`
        INSERT INTO leases (
          store_number, location_name, salon_number,
          address, city, state, zip,
          shopping_center, entity,
          landlord, landlord_contact,
          lease_start, lease_end,
          monthly_rent, sqft,
          latest_amendment, amendment_date,
          status, key_terms
        ) VALUES (
          ${classification.store_number || String(classification.salon_number || 'TBD')},
          ${classification.shopping_center ? 'SUPERCUTS - ' + classification.shopping_center : 'Unknown Location'},
          ${classification.salon_number ? String(classification.salon_number) : null},
          ${classification.property_address},
          ${classification.city}, ${classification.state}, ${classification.zip},
          ${classification.shopping_center}, ${classification.entity},
          ${classification.landlord}, ${classification.landlord_contact || null},
          ${classification.lease_start}, ${classification.lease_end},
          ${classification.monthly_rent}, ${classification.sqft},
          ${classification.document_type.includes('Amendment') ? classification.document_type : 'Original Lease'},
          ${classification.document_date},
          'active',
          ${classification.key_terms}
        )
        RETURNING id
      `;
      leaseId = newLease[0].id;
    } catch (e) {
      console.error('Error creating lease:', e.message);
    }
  }

  return leaseId;
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileSize = fileBuffer.length;

    // ─── Step 1: OCR ───
    let ocrText = '';
    try {
      ocrText = await ocrDocument(fileBuffer, fileName);
    } catch (ocrError) {
      console.error('OCR error:', ocrError.message);
      // Continue without OCR — we can still save the document
      ocrText = `[OCR failed: ${ocrError.message}]`;
    }

    // ─── Step 2: AI Classification ───
    let classification = { document_type: 'Unclassified', confidence: 0 };
    try {
      if (ocrText && !ocrText.startsWith('[OCR failed')) {
        classification = await classifyDocument(ocrText, fileName);
      }
    } catch (classifyError) {
      console.error('Classification error:', classifyError.message);
    }

    // ─── Step 3: Find or create lease ───
    const leaseId = await findOrCreateLease(classification);

    // ─── Step 4: Save document record to DB ───
    const doc = await sql`
      INSERT INTO documents (
        lease_id, file_name, file_size,
        doc_type, doc_date, confidence, ai_classification,
        ocr_text, ocr_processed
      ) VALUES (
        ${leaseId}, ${fileName}, ${fileSize},
        ${classification.document_type}, ${classification.document_date || null},
        ${classification.confidence}, ${JSON.stringify(classification)},
        ${(ocrText || '').substring(0, 50000)}, ${ocrText && !ocrText.startsWith('[OCR failed') ? true : false}
      )
      RETURNING *
    `;

    // ─── Step 5: Update lease if amendment ───
    if (leaseId && classification.document_type && classification.document_type.includes('Amendment')) {
      await sql`
        UPDATE leases 
        SET latest_amendment = ${classification.document_type},
            amendment_date = ${classification.document_date}
        WHERE id = ${leaseId}
      `;
    }

    // Update lease fields if we got new info from OCR
    if (leaseId && classification.confidence > 60) {
      const updates = {};
      if (classification.landlord) updates.landlord = classification.landlord;
      if (classification.monthly_rent) updates.monthly_rent = classification.monthly_rent;
      if (classification.sqft) updates.sqft = classification.sqft;
      if (classification.lease_start) updates.lease_start = classification.lease_start;
      if (classification.lease_end) updates.lease_end = classification.lease_end;
      if (classification.key_terms) updates.key_terms = classification.key_terms;

      if (Object.keys(updates).length > 0) {
        // Build dynamic update
        for (const [field, value] of Object.entries(updates)) {
          try {
            await sql(`UPDATE leases SET ${field} = $1 WHERE id = $2 AND (${field} IS NULL OR ${field} = '')`, [value, leaseId]);
          } catch (e) {
            // Skip fields that fail (e.g. type mismatch)
          }
        }
      }
    }

    return Response.json({
      success: true,
      document: doc[0],
      classification,
      lease_id: leaseId,
      ocr_length: ocrText.length,
      message: `${fileName} processed: ${classification.document_type} (${classification.confidence}% confidence)${leaseId ? ' — matched to lease' : ' — no lease match'}`
    });

  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Allow larger file uploads (50MB)
export const config = {
  api: {
    bodyParser: false,
  },
};