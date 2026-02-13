import Anthropic from '@anthropic-ai/sdk';
import { promises as fs } from 'fs';
import path from 'path';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

let storeMemory = null;
async function loadMemory() {
  if (storeMemory) return storeMemory;
  try {
    const filePath = path.join(process.cwd(), 'data', 'store-memory.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    storeMemory = JSON.parse(raw);
    return storeMemory;
  } catch {
    return [];
  }
}

export async function POST(request) {
  const { ocrText, fileName, folderPath, existingLeases } = await request.json();

  const memory = await loadMemory();

  const storeDirectory = memory.map(s =>
    `Salon #${s.salon_number} | Entity: ${s.entity} | Name: ${s.store_name} | ` +
    `Center: ${s.shopping_center} | ${s.address}, ${s.city}, ${s.state} ${s.zip} | ` +
    `LED: ${s.led} | Internal: ${s.internal_name}`
  ).join("\n");

  let sessionContext = "";
  if (existingLeases && existingLeases.length > 0) {
    sessionContext = `

PREVIOUSLY CLASSIFIED IN THIS SESSION (match new docs to these if same location):
${existingLeases.map(l =>
  `- Salon #${l.salon_number || l.store} | Entity: ${l.entity} | Address: ${l.address} | Landlord: ${l.landlord} | Center: ${l.center}`
).join("\n")}`;
  }

  let folderContext = "";
  if (folderPath) {
    folderContext = `\nDropbox path: ${folderPath}`;
  }

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [
      {
        role: 'user',
        content: `You are an expert real estate document classifier for Dogwood Brands, a private equity firm operating Supercuts salon locations.

YOUR STORE DIRECTORY (this is your memory — match documents to these known stores):
${storeDirectory}

ENTITY KEY:
- SC-31 = Southern California stores (29 locations)
- SC-3 = Additional California stores (3 locations)
- SD-06 = San Diego area stores (4 locations)
- LV-14 = Las Vegas stores (12 locations)
- EE-1 = Additional Las Vegas stores (4 locations)
- PHX-06 = Phoenix area stores (6 locations)
${sessionContext}

CRITICAL MATCHING RULES:
1. ALWAYS try to match the document to a known store from the directory above
2. Match by address — even partial matches (e.g. "12218 Apple Valley Rd" matches salon #80660)
3. Match by shopping center name (e.g. "Apple Valley Village" matches salon #80660)
4. Match by salon/store number if mentioned in the document
5. Match by city + street name as a fallback
6. The entity MUST match the store directory (e.g. salon #80660 is entity SC-31)
7. If you cannot match to any known store, flag it clearly in classification_notes
${folderContext}

DOCUMENT TYPES:
- "Original Lease" = initial lease agreement
- "Amendment #N" = amendments (First Amendment = #1, Second = #2, etc.)
- "Renewal" = formal renewal agreement
- "Assignment" = lease assignment
- "Sublease" = sublease agreement
- "Estoppel Certificate" = estoppel
- "SNDA" = subordination, non-disturbance, and attornment agreement
- "Insurance" = certificate of insurance
- "Correspondence" = letters, notices
- "Guaranty" = personal or corporate guaranty
- "Memorandum of Lease" = recorded memorandum
- "Other" = anything else

Return ONLY a valid JSON object — no markdown, no backticks:

{
  "entity_name": "entity code from directory (SC-31, LV-14, etc.)",
  "salon_number": number from directory match or 0 if unmatched,
  "store_name": "store name from directory or from document",
  "store_number_source": "matched_directory" or "found_in_document" or "unmatched",
  "document_type": "type from list above",
  "document_date": "YYYY-MM-DD",
  "property_address": "full address from document",
  "shopping_center": "center name",
  "market": "Southern California" or "San Diego" or "Las Vegas" or "Phoenix" or other,
  "landlord_name": "landlord entity",
  "landlord_contact": "contact info if found",
  "lease_start_date": "YYYY-MM-DD",
  "lease_end_date": "YYYY-MM-DD",
  "monthly_base_rent": number or 0,
  "monthly_cam": number or 0,
  "square_footage": number or 0,
  "renewal_options": "description",
  "key_terms": "escalation, co-tenancy, exclusives, kick-out, personal guaranty, etc.",
  "amendment_summary": "what changed if amendment",
  "references_documents": "other docs referenced",
  "suggested_folder": "/Dogwood/[entity]/[salon_number]-[store_name]/",
  "suggested_filename": "Original-Lease.pdf or Amendment-01.pdf etc",
  "confidence": 0-100,
  "classification_notes": "explain how you matched this to a store, or why you couldn't"
}

Rules:
- For monthly_base_rent: if annual rent, divide by 12
- Empty string for text not found, 0 for numbers not found
- Lower confidence if match is uncertain
- ALWAYS explain matching reasoning in classification_notes

File name: ${fileName}

Document text:
${ocrText.substring(0, 20000)}`
      }
    ]
  });

  const responseText = message.content[0].text;
  const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    const data = JSON.parse(cleaned);
    return Response.json({ success: true, classification: data });
  } catch (parseError) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        return Response.json({ success: true, classification: data });
      } catch (e) { /* fall through */ }
    }
    return Response.json({
      success: false,
      error: 'Failed to parse AI response',
      rawResponse: responseText
    }, { status: 422 });
  }
}