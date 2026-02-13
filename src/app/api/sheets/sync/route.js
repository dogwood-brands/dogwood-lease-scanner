import { google } from 'googleapis';

export async function POST(request) {
  const { leases } = await request.json();

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_CREDENTIALS,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets'
    ],
  });
  const sheets = google.sheets({
    version: 'v4', auth
  });

  // Build rows from lease data
  const headers = [['Store #','Location','Address',
    'Shopping Center','Market','Landlord','Contact',
    'Lease Start','Lease End','Base Rent','CAM',
    'All-In','SqFt','Latest Amendment',
    'Amendment Date','Renewal Options','Status',
    'Dropbox Link','Key Terms']];

  const rows = leases.map(l => [
    l.store_number, l.location_name, l.address,
    l.shopping_center, l.market, l.landlord,
    l.landlord_contact, l.lease_start, l.lease_end,
    l.monthly_rent, l.monthly_cam,
    (l.monthly_rent||0) + (l.monthly_cam||0),
    l.sqft, l.latest_amendment, l.amendment_date,
    l.renewal_options, l.status, l.dropbox_link,
    l.key_terms
  ]);

  // Clear and rewrite the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Sheet1',
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [...headers, ...rows]
    },
  });

  return Response.json({ success: true });
}
