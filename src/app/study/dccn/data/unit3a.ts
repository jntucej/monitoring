import type { DccnCheatTopic } from "./types";

export const unit3Topics: DccnCheatTopic[] = [
  {
    id: "ipv4-subnetting-vlsm",
    unit: "III",
    title: "IPv4 Subnetting, CIDR & VLSM Worked Numerical",
    category: "IP Addressing",
    importance: "HIGH",
    definition:
      "Subnetting divides a classful IP network into smaller sub-networks using Subnet Masks and Classless Inter-Domain Routing (CIDR) notation.",
    formula: {
      expression: "Number of Hosts = 2^(32 - CIDR) - 2   •   Network Address = IP AND Mask",
      symbols: { CIDR: "Prefix length (e.g. /26)", "-2": "Subtract Network Address and Broadcast Address" },
    },
    steps: [
      "Example: 192.168.1.0/26",
      "1. Subnet Mask = 255.255.255.192 (binary 11111111.11111111.11111111.11000000).",
      "2. Host bits = 32 - 26 = 6 bits ⟹ 2⁶ - 2 = 62 usable host IPs per subnet.",
      "3. Block size = 256 - 192 = 64 IPs per subnet block.",
      "4. Subnets: 192.168.1.0/26 (0-63), 192.168.1.64/26 (64-127), 192.168.1.128/26 (128-191).",
    ],
    examPoints: [
      "Given IP network 192.168.10.0/24, create 4 subnets with VLSM host requirements — guaranteed 10-marker.",
      "Identify Network ID, First IP, Last IP, and Broadcast IP for a CIDR block.",
    ],
    memoryTrigger: "Host IPs = 2^(32-prefix) - 2. Block size = 256 - last mask octet.",
    keywords: ["IPv4", "subnetting", "CIDR", "VLSM", "subnet mask", "broadcast address"],
  },
  {
    id: "distance-vector-vs-link-state",
    unit: "III",
    title: "Distance Vector (RIP) vs Link State (OSPF) Routing",
    category: "Routing Algorithms",
    importance: "HIGH",
    definition:
      "Routing algorithms determine the optimal paths through a network of routers to forward IP packets.",
    differences: [
      { feature: "Distance Vector (RIP)", valA: "Bellman-Ford Algorithm", valB: "Exchanges full routing tables only with immediate neighbors. Suffers from Count-to-Infinity problem." },
      { feature: "Link State (OSPF)", valA: "Dijkstra's Shortest Path Algorithm", valB: "Floods link status to all routers in area. Computes shortest path tree locally." },
    ],
    examPoints: [
      "Trace Bellman-Ford vs Dijkstra algorithm on given network topology.",
      "Explain Count-to-Infinity problem and Split Horizon solution in RIP.",
    ],
    memoryTrigger: "RIP = Bellman-Ford + Neighbors. OSPF = Dijkstra + Full Topology Map.",
    keywords: ["distance vector", "link state", "RIP", "OSPF", "Bellman Ford", "Dijkstra"],
  },
];
