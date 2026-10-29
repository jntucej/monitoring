#!/bin/bash
# access-digest.sh — Weekly access digest top users and endpoints
echo "=== Top 10 API Access Users (Last 7 Days) ==="
docker exec gate_postgres psql -U postgres -d gate_monitor -c "
  SELECT u.unique_id, u.role, count(*) as requests 
  FROM api_metrics am 
  JOIN users u ON am.user_id = u.id 
  WHERE am.timestamp > now() - interval '7 days' 
  GROUP BY u.unique_id, u.role 
  ORDER BY requests DESC LIMIT 10;
"
echo "=== Top 10 API Endpoints (Last 7 Days) ==="
docker exec gate_postgres psql -U postgres -d gate_monitor -c "
  SELECT path, method, count(*) as requests, avg(duration)::int as avg_ms 
  FROM api_metrics 
  WHERE timestamp > now() - interval '7 days' 
  GROUP BY path, method 
  ORDER BY requests DESC LIMIT 10;
"
