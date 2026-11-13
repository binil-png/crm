import {
  getAccessToken,
  getSpreadsheetId,
  getTrainingSpreadsheetId,
  googleFetch,
  isDemoMode,
  isGapiReady,
} from './googleApi';

const driveFileUrl = (fileId) =>
  `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=modifiedTime,version&supportsAllDrives=true`;

const stampFromPayload = (data) => `${data?.modifiedTime || ''}:${data?.version || ''}`;

const stampForFile = async (fileId) => {
  if (!fileId) return '';
  if (isGapiReady() && window.gapi?.client?.drive?.files) {
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
    const extra = training && training !== getSpreadsheetId() ? await stampForFile(training) : '';
    return `${sales}|${extra}`;
  } catch (error) {
    console.warn('Drive change check skipped.', error);
    return '';
  }
};
