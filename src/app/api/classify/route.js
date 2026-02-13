import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  // Get the OCR text and file name from the request
  // (OCR text comes from the /api/ocr route you built in Step 4.5)
  const { ocrText, fileName } = await request.json();

  // ---- Send to Claude for classification ----
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `You are a real estate document classifier for Dogwood Brands, which operates Supercuts salon locations across Houston, Dallas, and Atlanta.

Analyze the following document text and return ONLY a valid JSON object — no markdown, no backticks, no explanation, just the JSON.

{
  "document_type": "Original Lease" or "Amendment #1" or "Amendment #2" (etc) or "Correspondence" or "Insurance" or "Tax" or "Other",
  "property_address": "full street address with suite, city, state, zip",
  "shopping_center": "name of the shopping center or strip mall",
  "market": "Houston" or "Dallas" or "Atlanta" or "Austin" or "Other",
  "landlord_name": "the landlord entity name",
  "landlord_contact": "contact name and phone number if found, otherwise empty string",
  "lease_start_date": "YYYY-MM-DD or empty string if not found",
  "lease_end_date": "YYYY-MM-DD or empty string if not found",
  "monthly_base_rent": number or 0 if not found,
  "monthly_cam": number or 0 if not found (CAM, NNN, or common area charges),
  "square_footage": number or 0 if not found,
  "renewal_options": "description of renewal options, e.g. '2 x 5-year options'",
  "key_terms": "important terms like escalation %, co-tenancy, kick-out clauses, exclusives",
  "amendment_summary": "if this is an amendment, what changed — otherwise empty string",
  "confidence": number from 0 to 100 representing how confident you are in the extraction
}

Rules:
- For monthly_base_rent: if the lease shows annual rent, divide by 12
- For document_type: read the document carefully — if it says "First Amendment" or "Amendment No. 1" that is "Amendment #1", if it says "Second Amendment" that is "Amendment #2", etc.
- For market: determine from the city/state in the address
- If you cannot find a value, use empty string for text fields or 0 for numbers
- confidence should be lower if the document is blurry, partial, or if you had to guess

The original file name was: ${fileName}

Here is the document text:
${ocrText.substring(0, 15000)}`
      }
    ]
  });

  // ---- Parse Claude's response ----
  const responseText = message.content[0].text;

  // Clean up in case Claude adds markdown formatting
  const cleaned = responseText
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    const data = JSON.parse(cleaned);
    return Response.json({
      success: true,
      classification: data
    });
  } catch (parseError) {
    // If Claude's response isn't valid JSON, return the raw text
    // so you can debug what went wrong
    return Response.json({
      success: false,
      error: 'Failed to parse AI response',
      rawResponse: responseText
    }, { status: 422 });
  }
}