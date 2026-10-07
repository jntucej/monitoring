import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/dbClient';

// Middleware to collect API performance metrics
export async function metricsMiddleware(req: NextRequest, handler: () => Promise<Response>) {
  const startTime = Date.now();
  const path = req.nextUrl.pathname;
  
  // Skip metrics for health check endpoints to avoid feedback loop
  if (path.includes('/api/health') || path.includes('/api/metrics')) {
    return handler();
  }

  try {
    const response = await handler();
    const duration = Date.now() - startTime;
    const statusCode = response.status;

    // Log metrics asynchronously (don't block response)
    logMetrics({
      path,
      method: req.method,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logMetrics({
      path,
      method: req.method,
      statusCode: 500,
      duration,
      error: String(error),
      timestamp: new Date().toISOString(),
    }).catch(() => {});
    throw error;
  }
}

// Log metrics to database
async function logMetrics(data: {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  error?: string;
  timestamp: string;
}) {
  try {
    await supabase
      .from('api_metrics')
      .insert({
        path: data.path,
        method: data.method,
        status_code: data.statusCode,
        response_time: data.duration,
        error: data.error || null,
        timestamp: data.timestamp,
      });
  } catch (error) {
    console.error('Error logging API metrics:', error);
  }
}

// Get API metrics
export async function getAPIMetrics(filters: {
  from?: string;
  to?: string;
  path?: string;
  limit?: number;
}) {
  let query = supabase
    .from('api_metrics')
    .select('*')
    .order('timestamp', { ascending: false });

  if (filters.from) {
    query = query.gte('timestamp', filters.from);
  }

  if (filters.to) {
    query = query.lte('timestamp', filters.to);
  }

  if (filters.path) {
    query = query.eq('path', filters.path);
  }

  const limit = filters.limit || 100;
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching API metrics:', error);
    return [];
  }

  return data || [];
}

// Get aggregate metrics
export async function getAggregateMetrics(timeRange: string) {
  const now = new Date();
  let from = new Date();

  switch (timeRange) {
    case '1h':
      from.setHours(now.getHours() - 1);
      break;
    case '24h':
      from.setDate(now.getDate() - 1);
      break;
    case '7d':
      from.setDate(now.getDate() - 7);
      break;
    case '30d':
      from.setDate(now.getDate() - 30);
      break;
    default:
      from.setHours(now.getHours() - 1);
  }

  const { data, error } = await supabase
    .from('api_metrics')
    .select('*')
    .gte('timestamp', from.toISOString());

  if (error) {
    console.error('Error fetching aggregate metrics:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      statusCodes: {},
      endpoints: {},
      timeRange,
    };
  }

  const totalRequests = data.length;
  const totalResponseTime = data.reduce((sum: number, m: any) => sum + (m.response_time || 0), 0);
  const errors = data.filter((m: any) => m.status_code >= 400);

  const statusCodes: Record<number, number> = {};
  const endpoints: Record<string, { count: number; avgTime: number }> = {};

  for (const metric of data) {
    // Status codes
    statusCodes[metric.status_code] = (statusCodes[metric.status_code] || 0) + 1;

    // Endpoints
    if (!endpoints[metric.path]) {
      endpoints[metric.path] = { count: 0, avgTime: 0 };
    }
    endpoints[metric.path].count++;
    endpoints[metric.path].avgTime = 
      (endpoints[metric.path].avgTime * (endpoints[metric.path].count - 1) + metric.response_time) / 
      endpoints[metric.path].count;
  }

  return {
    totalRequests,
    averageResponseTime: totalResponseTime / totalRequests,
    errorRate: errors.length / totalRequests,
    statusCodes,
    endpoints,
    timeRange,
  };
}
