'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1>Application error</h1>
        <p>{error.message || 'An unexpected error occurred.'}</p>
        <button onClick={() => reset()} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Try again</button>
      </body>
    </html>
  );
}
