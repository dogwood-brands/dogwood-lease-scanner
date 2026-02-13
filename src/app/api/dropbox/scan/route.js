import { Dropbox } from 'dropbox';

export async function POST() {
  const dbx = new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN
  });

  // Recursively find all PDFs in your entire Dropbox
  async function findPDFs(path = '') {
    let files = [];
    let result = await dbx.filesListFolder({
      path: path,
      recursive: true
    });
    files = result.result.entries.filter(
      f => f['.tag'] === 'file' &&
      f.name.toLowerCase().endsWith('.pdf')
    );
    return files;
  }

  try {
    const pdfs = await findPDFs();
    return Response.json({
      success: true,
      files: pdfs.map(f => ({
        name: f.name,
        path: f.path_lower,
        size: f.size,
        modified: f.server_modified
      }))
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}