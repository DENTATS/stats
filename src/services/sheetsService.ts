import { getAccessToken } from './firebaseAuth';

/**
 * Extracts Google Spreadsheet ID from raw input or URL
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  // Match https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Reads data from a Google Spreadsheet
 */
export async function readGoogleSheet(
  spreadsheetIdOrUrl: string,
  sheetRange = 'A1:ZZ1000'
): Promise<{ headers: string[]; rows: any[][]; title: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in with Google to access Google Sheets.');
  }

  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('Invalid Google Spreadsheet ID or URL.');
  }

  // 1. Fetch metadata to get title & first sheet name if not specified
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to access spreadsheet (HTTP ${metaRes.status})`);
  }

  const metaData = await metaRes.json();
  const title = metaData.properties?.title || 'Google Sheet';
  const firstSheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

  // 2. Fetch cell values
  const range = sheetRange.includes('!') ? sheetRange : `'${firstSheetTitle}'!${sheetRange}`;
  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!valuesRes.ok) {
    const err = await valuesRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch data from sheet (HTTP ${valuesRes.status})`);
  }

  const data = await valuesRes.json();
  const rawRows: any[][] = data.values || [];

  if (rawRows.length === 0) {
    throw new Error('The requested Google Sheet range is empty.');
  }

  const headers = rawRows[0].map((h, idx) => (h ? String(h).trim() : `Column_${idx + 1}`));
  const rows = rawRows.slice(1);

  return {
    headers,
    rows,
    title,
  };
}

/**
 * Creates a new Google Spreadsheet and exports tabular data
 */
export async function createAndExportGoogleSheet(
  title: string,
  dataRows: (string | number)[][]
): Promise<{ spreadsheetId: string; url: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('You must be signed in with Google to export to Google Sheets.');
  }

  // 1. Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `StatsMate — ${title}`,
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create new spreadsheet (HTTP ${createRes.status})`);
  }

  const newSheet = await createRes.json();
  const spreadsheetId = newSheet.spreadsheetId;

  // 2. Append rows
  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: dataRows,
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to populate sheet data (HTTP ${appendRes.status})`);
  }

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}
