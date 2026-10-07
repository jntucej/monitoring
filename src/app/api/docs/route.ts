import { NextResponse } from "next/server";

export async function GET() {
  const openApiSpec = {
    openapi: "3.0.0",
    info: {
      title: "Gate Monitor API Spec",
      version: "1.0.0",
      description: "Comprehensive REST API documentation for Gate Monitor Security Platform",
    },
    paths: {
      "/api/auth/login": {
        post: {
          summary: "User Login",
          description: "Authenticate user and issue session token",
          responses: { 200: { description: "Successful login" } },
        },
      },
      "/api/gate/scan": {
        post: {
          summary: "Gate Scan",
          description: "Process entry/exit scan for student, staff, or visitor",
          responses: { 200: { description: "Scan decision" } },
        },
      },
      "/api/passes": {
        get: { summary: "List Passes", responses: { 200: { description: "List of active passes" } } },
        post: { summary: "Request Pass", responses: { 200: { description: "Pass created" } } },
      },
      "/api/integrations": {
        get: { summary: "List Integrations", responses: { 200: { description: "Integration providers" } } },
      },
      "/api/metrics": {
        get: { summary: "Prometheus Metrics", responses: { 200: { description: "Prometheus text metrics" } } },
      },
    },
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Gate Monitor API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4/swagger-ui.css" />
</head>
<body style="margin: 0; background: #090d16;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      spec: ${JSON.stringify(openApiSpec)},
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ]
    });
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
