// tests/gate/helpers/render-with-providers.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';

interface ProvidersProps {
  theme?: 'dark' | 'light' | 'glass';
}

function Providers({ children }: React.PropsWithChildren<ProvidersProps>) {
  // Keep this minimal — avoid GlassProvider because it opens a WS/SSE stream.
  return <>{children}</>;
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: Omit<RenderOptions, 'wrapper'> = {},
) {
  return render(ui, { wrapper: Providers, ...options });
}

export * from '@testing-library/react';
