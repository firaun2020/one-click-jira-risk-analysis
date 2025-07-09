import React, { useState } from 'react';
import ForgeReconciler, {
  Text,
  Button,
  Stack,
  Heading,
  SectionMessage,
} from '@forge/react';
import { invoke } from '@forge/bridge';


const App = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState(null);

  const handleClick = async () => {
    setLoading(true);
    setStatus(null);
    setMessage(null);

    try {
      const response = await invoke('runRiskAnalysis');

      if (response.status === 'success') {
        setStatus('success');
        setMessage(response.message);
      } else if (response.status === 'already-exists') {
        setStatus('info');
        setMessage(response.message);
      } else {
        setStatus('error');
        setMessage('Unexpected response from backend.');
      }
    } catch (error) {
      console.error('Risk analysis error:', error);
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack vertical spacing="large" space="space.200">
      <Heading size="medium">AI Risk Analysis</Heading>
      <Text>
        Click the button below to generate Risk Analysis using AI for this issue. The result will
        be shown in the "Risk-Analysis" field above.
      </Text>

      <Stack alignInline="start" space="space.200">
        <Button
          appearance="primary"
          isLoading={loading}
          onClick={handleClick}
        >
          {loading ? 'Analyzing...' : 'Run Risk Analysis'}
        </Button>
      </Stack>

      {status && (
        <SectionMessage
          title={status === 'success' ? 'Success' : status === 'info' ? 'Info' : 'Error'}
          appearance={status === 'success' ? 'confirmation' : status === 'info' ? 'info' : 'error'}
        >
          <Text>{message}</Text>
        </SectionMessage>
      )}
    </Stack>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
