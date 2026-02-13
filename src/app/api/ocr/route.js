import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { Dropbox } from 'dropbox';

export async function POST(request) {
  // Get the file path from the request
  // (this comes from the scan results — each file has a path)
  const { filePath } = await request.json();

  // ---- STEP 1: Download the PDF from Dropbox ----
  const dbx = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN
  });

  const file = await dbx.filesDownload({ path: filePath });

  // fileBinary is the raw PDF bytes
  const buffer = file.result.fileBinary;

  // ---- STEP 2: Send to Google Document AI for OCR ----
  const client = new DocumentProcessorServiceClient({
    keyFilename: process.env.GOOGLE_CREDENTIALS
  });

  // This long string tells Google which processor to use
  // It combines your project ID, location, and processor ID
  const processorName =
    `projects/${process.env.GOOGLE_PROJECT_ID}` +
    `/locations/us` +
    `/processors/${process.env.GOOGLE_PROCESSOR_ID}`;

  const [result] = await client.processDocument({
    name: processorName,
    rawDocument: {
      // Convert the PDF bytes to base64 (Google requires this format)
      content: Buffer.from(buffer).toString('base64'),
      mimeType: 'application/pdf',
    },
  });

  // ---- STEP 3: Pull out the text ----
  const extractedText = result.document.text;

  return Response.json({
    success: true,
    text: extractedText,
    pageCount: result.document.pages.length
  });
}