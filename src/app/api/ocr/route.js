import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

function getClient() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    return new DocumentProcessorServiceClient({ credentials });
  }
  if (process.env.GOOGLE_CREDENTIALS) {
    return new DocumentProcessorServiceClient({ keyFilename: process.env.GOOGLE_CREDENTIALS });
  }
  return new DocumentProcessorServiceClient({ keyFilename: 'service-account-key.json' });
}

export async function POST(request) {
  const { filePath } = await request.json();
  const token = process.env.DROPBOX_ACCESS_TOKEN;

  try {
    const downloadRes = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Dropbox-API-Arg': JSON.stringify({ path: filePath }),
      },
    });

    if (!downloadRes.ok) {
      return Response.json({ error: `Dropbox download failed: ${downloadRes.statusText}` }, { status: 400 });
    }

    const fileBuffer = await downloadRes.arrayBuffer();

    const client = getClient();
    const processorName = `projects/${process.env.GOOGLE_PROJECT_ID}/locations/us/processors/${process.env.GOOGLE_PROCESSOR_ID}`;

    const [result] = await client.processDocument({
      name: processorName,
      rawDocument: {
        content: Buffer.from(fileBuffer).toString('base64'),
        mimeType: 'application/pdf',
      },
    });

    return Response.json({
      success: true,
      text: result.document.text,
      pageCount: result.document.pages.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}