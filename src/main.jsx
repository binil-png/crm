import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import SetupScreen from './components/shared/SetupScreen.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { enableLocalDemo, getConfig } from './services/googleApi.js';
import './index.css';

if (new URLSearchParams(window.location.search).get('demo') === '1') {
  enableLocalDemo();
}

function Root() {
  const [config, setConfig] = useState(getConfig);
  const needsSetup =
    !config.demoMode && (!config.clientId || !config.spreadsheetId || !config.trainingSpreadsheetId);

  if (needsSetup) {
    return <SetupScreen onSaved={setConfig} />;
  }

  return (
    <GoogleOAuthProvider clientId={config.clientId || 'demo-client-id'}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
