import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

export async function POST(request) {
  const { filePath } = await request.json();
  const token = process.env.DROPBOX_ACCESS_TOKEN;

  try {
    // 1. Download PDF from Dropbox using native fetch
    const downloadRes = await fetch(
      'https://content.dropboxapi.com/2/files/download',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Dropbox-API-Arg': JSON.stringify({ path: filePath }),
        },
      }
    );

    if (!downloadRes.ok) {
      return Response.json(
        { error: `Dropbox download failed: ${downloadRes.statusText}` },
        { status: 400 }
      );
    }

    const fileBuffer = await downloadRes.arrayBuffer();

    // 2. Send to Google Document AI for OCR
    const client = new DocumentProcessorServiceClient({
      keyFilename: process.env.GOOGLE_CREDENTIALS,
    });

    const processorName =
      `projects/${process.env.GOOGLE_PROJECT_ID}` +
      `/locations/us` +
      `/processors/${process.env.GOOGLE_PROCESSOR_ID}`;

    const [result] = await client.processDocument({
      name: processorName,
      rawDocument: {
        content: Buffer.from(fileBuffer).toString('base64'),
        mimeType: 'application/pdf',
      },
    });

    const text = result.document.text;

    return Response.json({
      success: true,
      text: text,
      pageCount: result.document.pages.length,
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}