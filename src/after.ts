import { after } from 'next/server';

after(async ({ request }: { request: Request & { id?: string } }) => {
  try {
    const startTime = Date.now() - parseInt(request.headers.get('x-response-time') || '0', 10);
    const duration = Date.now() - startTime;
    const url = new URL(request.url).pathname;
    
    // Log to console for debugging
    console.log(`[after] ${url} took ${duration}ms`);
    
    // Store in a temp location (Redis or just log)
    // For now, let's just ensure the after hook is being called
  } catch (e) {
    console.error('[after] Error:', e);
  }
});
