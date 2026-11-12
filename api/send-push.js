import { handlePushHttp } from '../server/onesignalPush.js';

export default async function handler(req, res) {
  const result = await handlePushHttp(req, process.env);
  res.statusCode = result.status;
  if (result.status === 204) {
    res.end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result.body));
}
