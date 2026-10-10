export interface AnomalyCandidate {
  metric: string;
  actual: number;
  expected: number;
  stdDev: number;
}

export async function findAnomalyCandidates(): Promise<AnomalyCandidate[]> {
  // Verifying if this needs SQL. The original lib code has hardcoded data:
  // const checks = [
  //   { metric: "Gate Traffic - Main Entrance", actual: 245, expected: 130, stdDev: 35 },
  //   ...
  // ];
  // If it is just hardcoded, this repository might not need a query.
  // BUT the instructions said: "Move the SQL into a repository", "Each is a SQL statement".
  // Looking at the code again, it is NOT SQL. It is data in a checks array.
  // I will make it return the hardcoded data to preserve behavior.
  
  return [
    { metric: "Gate Traffic - Main Entrance", actual: 245, expected: 130, stdDev: 35 },
    { metric: "CSE Department Attendance", actual: 64.2, expected: 88.0, stdDev: 8.5 },
    { metric: "Emergency Out Pass Surge", actual: 42, expected: 12, stdDev: 6.0 },
  ];
}
