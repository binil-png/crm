import { getAccessToken, getSpreadsheetId, googleFetch, isDemoMode, isGapiReady } from './googleApi';

const driveFileUrl = (fileId) =>
  `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=modifiedTime,version&supportsAllDrives=true`;

export const getSpreadsheetStamp = async () => {
  if (isDemoMode()) return 'demo';
  const fileId = getSpreadsheetId();
  if (!fileId) return '';

  try {
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
  } catch (error) {
    console.warn('Drive change check skipped.', error);
    return '';
  }
};

const stampFromPayload = (data) => `${data?.modifiedTime || ''}:${data?.version || ''}`;
