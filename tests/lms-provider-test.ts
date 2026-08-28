import assert from "assert";
import { getLMSProvider, MoodleProvider, CanvasProvider, BlackboardProvider, SakaiProvider } from "../src/lib/integrations/lms-provider";

// Simple assert check for LMS Provider Factory & Concrete Instances
function testLMSProviders() {
  const moodle = getLMSProvider("moodle");
  assert.strictEqual(moodle.platform, "moodle");
  assert.ok(moodle instanceof MoodleProvider);

  const canvas = getLMSProvider("canvas");
  assert.strictEqual(canvas.platform, "canvas");
  assert.ok(canvas instanceof CanvasProvider);

  const blackboard = getLMSProvider("blackboard");
  assert.strictEqual(blackboard.platform, "blackboard");
  assert.ok(blackboard instanceof BlackboardProvider);

  const sakai = getLMSProvider("sakai");
  assert.strictEqual(sakai.platform, "sakai");
  assert.ok(sakai instanceof SakaiProvider);

  const defaultProvider = getLMSProvider("unknown_platform");
  assert.strictEqual(defaultProvider.platform, "moodle");

  console.log("✅ LMS Provider factory and concrete implementations test passed successfully!");
}

testLMSProviders();
