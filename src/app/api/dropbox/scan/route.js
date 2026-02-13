export async function POST() {
  const token = process.env.DROPBOX_ACCESS_TOKEN;

  try {
    let allFiles = [];
    
    // First call
    let response = await fetch(
      'https://api.dropboxapi.com/2/files/list_folder',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: '/Leasecake Data Dump Supercuts',
          recursive: true,
          limit: 2000,
        }),
      }
    );

    let data = await response.json();

    if (data.error) {
      return Response.json({ error: data.error_summary }, { status: 400 });
    }

    allFiles = [...data.entries];

    // Keep fetching if there are more pages
    while (data.has_more) {
      response = await fetch(
        'https://api.dropboxapi.com/2/files/list_folder/continue',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cursor: data.cursor,
          }),
        }
      );
      data = await response.json();
      allFiles = [...allFiles, ...data.entries];
    }

    // Filter to just PDFs
    const pdfs = allFiles
      .filter(f => f['.tag'] === 'file' && f.name.toLowerCase().endsWith('.pdf'))
      .map(f => ({
        name: f.name,
        path: f.path_lower,
        size: f.size,
        modified: f.server_modified,
        // Extract the folder structure so you can see
        // which entity/salon each file belongs to
        folder: f.path_lower.split('/').slice(0, -1).join('/'),
      }));

    return Response.json({
      success: true,
      files: pdfs,
      totalFound: pdfs.length,
      foldersScanned: allFiles.filter(f => f['.tag'] === 'folder').length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}