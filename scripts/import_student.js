const { createUser } = require("@/lib/db");
const { randomUUID } = require("crypto");

async function run() {
  const userId = randomUUID();
  console.log("Creating user:", userId);
  const user = await createUser({
    id: userId,
    name: "ANANTHULA AKSHAY",
    role: "student",
    email: "akshay2807004@gmail.com",
    uniqueId: "23JJ1A0201",
    status: "ACTIVE"
  });
  console.log("User created:", user);
}
run();
