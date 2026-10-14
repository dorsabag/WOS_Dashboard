import { ReplitConnectors } from "@replit/connectors-sdk";

/**
 * Google Sheets connector helper.
 * Never cache the connectors instance — tokens expire.
 * Always call getClient() fresh per request.
 */
function getClient() {
  return new ReplitConnectors();
}

const SHEETS_BASE = "https://sheets.googleapis.com";

/** Fetch full spreadsheet metadata (sheets list, properties, etc.) */
export async function getSpreadsheet(spreadsheetId: string) {
  const connectors = getClient();
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}?includeGridData=false`,
    { method: "GET" }
  );
  if (!res.ok) {
    throw new Error(`Google Sheets API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Read a range (e.g. "Sheet1!A1:Z100") from a spreadsheet */
export async function getRange(spreadsheetId: string, range: string) {
  const connectors = getClient();
  const encodedRange = encodeURIComponent(range);
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`,
    { method: "GET" }
  );
  if (!res.ok) {
    throw new Error(`Google Sheets API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<{ range: string; majorDimension: string; values: string[][] }>;
}

/** Read multiple ranges at once */
export async function batchGetRanges(spreadsheetId: string, ranges: string[]) {
  const connectors = getClient();
  const params = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&");
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values:batchGet?${params}`,
    { method: "GET" }
  );
  if (!res.ok) {
    throw new Error(`Google Sheets API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

/** Write values to a range */
export async function updateRange(
  spreadsheetId: string,
  range: string,
  values: (string | number | null)[][]
) {
  const connectors = getClient();
  const encodedRange = encodeURIComponent(range);
  const res = await connectors.proxy(
    "google-sheet",
    `/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ range, majorDimension: "ROWS", values }),
    }
  );
  if (!res.ok) {
    throw new Error(`Google Sheets API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
