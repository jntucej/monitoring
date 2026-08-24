const { spawn } = require("child_process");
const http = require("http");

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required.");
  process.exit(1);
}

function startDevServer() {
  return new Promise((resolve) => {
    console.log("Starting Next.js dev server on port 3001...");
    const fs = require("fs");
    const logStream = fs.createWriteStream("dev-server.log");
    const server = spawn("npx", ["next", "dev", "-p", "3001"], {
      shell: true,
      env: { 
        ...process.env, 
        PORT: "3001",
        SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY
      },
    });
    server.stdout.pipe(logStream);
    server.stderr.pipe(logStream);

    let resolved = false;
    server.stdout.on("data", (data) => {
      const output = data.toString();
      if (output.includes("Ready") || output.includes("started") || output.includes("3001") || output.includes("localhost")) {
        if (!resolved) {
          resolved = true;
          setTimeout(() => resolve(server), 4000);
        }
      }
    });
    setTimeout(() => { if (!resolved) { resolved = true; resolve(server); } }, 15000);
  });
}

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: 3001, ...options }, (res) => {
      let rawData = "";
      res.on("data", (chunk) => { rawData += chunk; });
      res.on("end", () => {
        try {
          resolve({ statusCode: res.statusCode, data: rawData ? JSON.parse(rawData) : null });
        } catch {
          resolve({ statusCode: res.statusCode, raw: rawData });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  let serverProcess;
  try {
    serverProcess = await startDevServer();
    console.log("Server is running. Starting validation flow...\n");

    console.log("Attempting Login for Session A...");
    const loginA = await makeRequest(
      { path: "/api/auth/pin-login", method: "POST", headers: { "Content-Type": "application/json" } },
      { employeeId: "OP-001", pin: "12345678" }
    );
    if (loginA.statusCode !== 200 || !loginA.data?.success) {
      throw new Error(`Session A login failed: ${JSON.stringify(loginA.data)}`);
    }
    const tokenA = loginA.data.data.token;
    const sessionTokenA = loginA.data.data.user.currentSessionToken;
    console.log(`- Session A Token: ${sessionTokenA}`);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("\nAttempting Login for Session B (Simulating second device)...");
    const loginB = await makeRequest(
      { path: "/api/auth/pin-login", method: "POST", headers: { "Content-Type": "application/json" } },
      { employeeId: "OP-001", pin: "12345678" }
    );
    if (loginB.statusCode !== 200 || !loginB.data?.success) {
      throw new Error(`Session B login failed: ${JSON.stringify(loginB.data)}`);
    }
    const tokenB = loginB.data.data.token;
    const sessionTokenB = loginB.data.data.user.currentSessionToken;
    console.log(`- Session B Token: ${sessionTokenB}`);

    if (sessionTokenA === sessionTokenB) throw new Error("FAIL: Both logins returned the same session token!");
    console.log("PASS: Both logins generated distinct session tokens.");

    console.log("\nTesting Request with Session A credentials (expecting 401 SESSION_EXPIRED)...");
    const testReqA = await makeRequest({
      path: "/api/gate/logs",
      method: "GET",
      headers: { Authorization: `Bearer ${tokenA}`, "X-Session-Token": sessionTokenA },
    });
    console.log(`- Status: ${testReqA.statusCode}, Body:`, testReqA.data);
    if (testReqA.statusCode !== 401 || testReqA.data?.error?.code !== "SESSION_EXPIRED") {
      throw new Error("FAIL: Session A request did not return 401 SESSION_EXPIRED!");
    }
    console.log("PASS: Session A request rejected correctly with 401 SESSION_EXPIRED.");

    console.log("\nTesting Request with Session B credentials (expecting 200 SUCCESS)...");
    const testReqB = await makeRequest({
      path: "/api/gate/logs",
      method: "GET",
      headers: { Authorization: `Bearer ${tokenB}`, "X-Session-Token": sessionTokenB },
    });
    console.log(`- Status: ${testReqB.statusCode}`);
    if (testReqB.statusCode !== 200) throw new Error("FAIL: Session B request failed!");
    console.log("PASS: Session B request completed successfully.");

    console.log("\nTesting supervisor verification (verifyOnly) does not affect existing handle...");
    console.log("Simulating Supervisor manual entry verification under existing Session B...");
    const verifySup = await makeRequest(
      { path: "/api/auth/pin-login", method: "POST", headers: { "Content-Type": "application/json" } },
      { employeeId: "OP-001", pin: "12345678", verifyOnly: true }
    );
    if (verifySup.statusCode !== 200 || !verifySup.data?.success) {
      throw new Error(`verifyOnly verification failed: ${JSON.stringify(verifySup.data)}`);
    }
    console.log("PASS: verifyOnly request completed successfully.");
    
    console.log("\nTesting Session B is still valid after a verification pin-login...");
    const testReqBPostVerify = await makeRequest({
      path: "/api/gate/logs",
      method: "GET",
      headers: { Authorization: `Bearer ${tokenB}`, "X-Session-Token": sessionTokenB },
    });
    console.log(`- Status: ${testReqBPostVerify.statusCode}`);
    if (testReqBPostVerify.statusCode !== 200) throw new Error("FAIL: Session B was invalidated by verifyOnly!");
    console.log("PASS: Session B remained valid.");

    console.log("\n=== ALL TESTS PASSED SUCCESSFULLY ===");
  } catch (err) {
    console.error("\n*** TEST FAILED:", err.message);
  } finally {
    if (serverProcess) {
      console.log("Stopping Dev Server...");
      serverProcess.kill("SIGTERM");
    }
  }
}

runTests();
