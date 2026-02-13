import { Dropbox } from 'dropbox';

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get('file');
  const storeNumber = formData.get('storeNumber');
  const docType = formData.get('docType');

  // 1. Upload to organized Dropbox folder
  const dbx = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN
  });
  const bytes = await file.arrayBuffer();
  const fileName = docType.replace(/ /g, '-')
    + '.pdf';
  const dbxPath = `/Dogwood/${storeNumber}/
    ${fileName}`;

  const uploadResult =
    await dbx.filesUpload({
      path: dbxPath,
      contents: Buffer.from(bytes),
      mode: { '.tag': 'overwrite' },
    });

  // 2. Get a shareable link
  let link;
  try {
    const linkResult =
      await dbx.sharingCreateSharedLinkWithSettings
        ({ path: dbxPath });
    link = linkResult.result.url;
  } catch(e) {
    // Link already exists
    const links =
      await dbx.sharingListSharedLinks
        ({ path: dbxPath });
    link = links.result.links[0]?.url;
  }

  // 3. Now call your OCR and classify
  //    endpoints and save to Supabase
  //    (you'll wire this from the frontend)

  return Response.json({
    success: true,
    dropboxPath: dbxPath,
    dropboxLink: link
  });
}
