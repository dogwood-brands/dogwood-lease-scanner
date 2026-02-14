// src/app/api/classify/route.js
// Updated: Now saves classification results to Neon Postgres
import Anthropic from '@anthropic-ai/sdk';
import sql from '@/lib/db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const body = await request.json();
    const { ocrText, fileName, filePath, dropboxLink, storeMemory } = body;

    // ─── Step 1: AI Classification ───
    const systemPrompt = `You are a real estate document classifier for Dogwood Brands, a private equity company that operates Supercuts salon locations. 

Given OCR text from a document, classify it and extract key information.

${storeMemory ? `STORE DIRECTORY (use this to match documents to locations):
${JSON.stringify(storeMemory, null, 2)}` : ''}

Respond in JSON only, no markdown:
{
  "document_type": "Original Lease | Amendment #N | Estoppel Certificate | LOI | Lease Abstract | Rent Schedule | CAM Reconciliation | Termination Notice | Renewal Notice | Correspondence | Insurance Certificate | Other",
  "entity": "entity code like SC-31, SD-06, LV-14, etc.",
  "store_number": "store number if found",
  "salon_number": "salon number if found",
  "property_address": "full address if found",
  "city": "city",
  "state": "state abbreviation",
  "zip": "zip code",
  "shopping_center": "shopping center name if found",
  "landlord": "landlord name if found",
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
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ 
        role: 'user', 
        content: `Classify this document.\n\nFile name: ${fileName}\nFile path: ${filePath}\n\nOCR Text (first 3000 chars):\n${(ocrText || '').substring(0, 3000)}` 
      }]
    });

    const responseText = message.content[0].text;
    let classification;
    try {
      classification = JSON.parse(responseText.replace(/```json\n?|```/g, '').trim());
    } catch {
      classification = { document_type: 'Unknown', confidence: 0, raw: responseText };
    }

    // ─── Step 2: Find or create the lease in the database ───
    let leaseId = null;

    if (classification.store_number || classification.property_address) {
      // Try to find existing lease by store number first
      if (classification.store_number) {
        const existing = await sql`
          SELECT id FROM leases WHERE store_number = ${classification.store_number} LIMIT 1
        `;
        if (existing.length > 0) {
          leaseId = existing[0].id;
        }
      }

      // Try by address if no store match
      if (!leaseId && classification.property_address) {
        const existing = await sql`
          SELECT id FROM leases WHERE address ILIKE ${`%${classification.property_address}%`} LIMIT 1
        `;
        if (existing.length > 0) {
          leaseId = existing[0].id;
        }
      }

      // Create new lease if not found and we have enough info
      if (!leaseId && classification.document_type !== 'Unknown') {
        const newLease = await sql`
          INSERT INTO leases (
            store_number, location_name, salon_number,
            address, city, state, zip,
            shopping_center, entity,
            landlord,
            lease_start, lease_end,
            monthly_rent, sqft,
            latest_amendment, amendment_date,
            status, key_terms, dropbox_folder
          ) VALUES (
            ${classification.store_number || 'TBD'},
            ${classification.shopping_center ? `Supercuts - ${classification.shopping_center}` : null},
            ${classification.salon_number},
            ${classification.property_address},
            ${classification.city}, ${classification.state}, ${classification.zip},
            ${classification.shopping_center}, ${classification.entity},
            ${classification.landlord},
            ${classification.lease_start}, ${classification.lease_end},
            ${classification.monthly_rent}, ${classification.sqft},
            ${classification.document_type.includes('Amendment') ? classification.document_type : 'Original Lease'},
            ${classification.document_date},
            'active',
            ${classification.key_terms},
            ${filePath ? filePath.split('/').slice(0, -1).join('/') : null}
          )
          RETURNING id
        `;
        leaseId = newLease[0].id;
      }
    }

    // ─── Step 3: Save the document record ───
    const doc = await sql`
      INSERT INTO documents (
        lease_id, file_name, original_path, doc_type, doc_date,
        confidence, ai_classification, ocr_text, ocr_processed, dropbox_link
      ) VALUES (
        ${leaseId}, ${fileName}, ${filePath}, 
        ${classification.document_type}, ${classification.document_date},
        ${classification.confidence}, ${JSON.stringify(classification)},
        ${(ocrText || '').substring(0, 50000)}, true, ${dropboxLink}
      )
      RETURNING *
    `;

    // ─── Step 4: Update lease if this is an amendment ───
    if (leaseId && classification.document_type && classification.document_type.includes('Amendment')) {
      await sql`
        UPDATE leases 
        SET latest_amendment = ${classification.document_type},
            amendment_date = ${classification.document_date}
        WHERE id = ${leaseId}
      `;
    }

    return Response.json({
      ...classification,
      lease_id: leaseId,
      document_id: doc[0].id,
      saved_to_db: true,
      file: fileName
    });

  } catch (error) {
    console.error('Classify error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
