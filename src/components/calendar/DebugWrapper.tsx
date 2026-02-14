import React from 'react';

export function DebugWrapper({ children }: { children: React.ReactNode }) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('DebugWrapper caught error:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>DebugWrapper Error</h2>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    );
  }
}
