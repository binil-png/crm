import {
  getAccessToken,
  getConfigSpreadsheetId,
  getEmployeesSpreadsheetId,
  getSpreadsheetId,
  getTrainingSpreadsheetId,
  googleFetch,
  isAppSheetsEnabled,
  isDemoMode,
  isGapiReady,
} from './googleApi';

const driveFileUrl = (fileId) =>
  `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=modifiedTime,version&supportsAllDrives=true`;

const stampFromPayload = (data) => `${data?.modifiedTime || ''}:${data?.version || ''}`;

const stampForFile = async (fileId) => {
  if (!fileId) return '';
  if (isGapiReady() && !isAppSheetsEnabled() && window.gapi?.client?.drive?.files) {
    const response = await window.gapi.client.drive.files.get({
      fileId,
      fields: 'modifiedTime,version',
      supportsAllDrives: true,
    });
    return stampFromPayload(response.result);
  }
  const token = getAccessToken();
  if (!token) return '';
  return stampFromPayload(await googleFetch(driveFileUrl(fileId)));
};

export const getSpreadsheetStamp = async () => {
  if (isDemoMode()) return 'demo';
  try {
    const sales = await stampForFile(getSpreadsheetId());
    const training = getTrainingSpreadsheetId();
    const employees = getEmployeesSpreadsheetId();
    const config = getConfigSpreadsheetId();
    const extra = training && training !== getSpreadsheetId() ? await stampForFile(training) : '';
    const people =
      employees && employees !== getSpreadsheetId() && employees !== training ? await stampForFile(employees) : '';
    const registry =
      config && config !== getSpreadsheetId() && config !== training && config !== employees
        ? await stampForFile(config)
        : '';
    return `${sales}|${extra}|${people}|${registry}`;
  } catch (error) {
    console.warn('Drive change check skipped.', error);
    return '';
  }
};
