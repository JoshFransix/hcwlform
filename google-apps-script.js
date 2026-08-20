// Paste this into script.google.com (a new project), bound to the Google
// Sheet where you want submissions stored. See README.md "Google Sheets
// setup" for the full deployment steps.

const SHEET_NAME = "Applications";
const SHARED_SECRET = "REPLACE_WITH_A_LONG_RANDOM_SECRET"; // must match SHEETS_SECRET in .env

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (SHARED_SECRET && data.secret !== SHARED_SECRET) {
      return jsonResponse({ error: "Unauthorized" });
    }
    if (!data.xUsername || !data.xPostLink || !data.walletAddress) {
      return jsonResponse({ error: "Missing required fields" });
    }

    getSheet().appendRow([
      data.timestamp ? new Date(data.timestamp) : new Date(),
      data.xUsername,
      data.xPostLink,
      data.walletAddress,
    ]);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ error: String(error) });
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet
      .appendRow(["Timestamp", "X Username", "X Post Link", "Wallet Address"])
      .setFrozenRows(1);
  }
  return sheet;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
