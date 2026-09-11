import type { DccnCheatTopic } from "./types";

export const unit5Topics: DccnCheatTopic[] = [
  {
    id: "dns-http-https",
    unit: "V",
    title: "DNS Resolution, HTTP/1.1 vs HTTP/2 vs HTTP/3",
    category: "Application Protocols",
    importance: "HIGH",
    definition:
      "Application layer protocols specify high-level network services for web browsing, domain resolution, and email.",
    differences: [
      { feature: "HTTP/1.1", valA: "Text-based, Head-of-Line Blocking", valB: "1 TCP connection per request or sequential pipelining" },
      { feature: "HTTP/2", valA: "Binary Framing, Multiplexing", valB: "Multiple streams over 1 single TCP connection + Server Push" },
      { feature: "HTTP/3", valA: "QUIC (UDP-based)", valB: "Eliminates TCP HOL blocking completely; zero-RTT handshake" },
    ],
    steps: [
      "DNS Iterative Resolution Steps:",
      "1. Client → Local DNS Resolver.",
      "2. Resolver → Root DNS Server (.) → Returns TLD Server IP (.com).",
      "3. Resolver → TLD DNS Server (.com) → Returns Authoritative DNS Server IP (example.com).",
      "4. Resolver → Authoritative Server → Returns target IPv4 A Record.",
    ],
    examPoints: [
      "Trace DNS Iterative vs Recursive Query resolution flow.",
      "Compare HTTP/1.1, HTTP/2, and HTTP/3 multiplexing and transport layers.",
    ],
    memoryTrigger: "DNS: Client → Local → Root → TLD → Authoritative. HTTP/2 = Multiplexing, HTTP/3 = QUIC/UDP.",
    keywords: ["DNS", "HTTP1.1", "HTTP2", "HTTP3", "QUIC", "authoritative server"],
  },
  {
    id: "rsa-cryptography-tls",
    unit: "V",
    title: "RSA Cryptography Worked Example & TLS Handshake",
    category: "Network Security",
    importance: "HIGH",
    definition:
      "RSA is an asymmetric public-key cryptosystem based on the mathematical difficulty of factoring the product of two large prime numbers.",
    formula: {
      expression: "Public Key (e, n)   •   Private Key (d, n)   •   C = M^e mod n   •   M = C^d mod n",
      symbols: { n: "p × q", phi: "(p-1)(q-1)", e: "gcd(e, phi)=1", d: "(e × d) ≡ 1 mod phi" },
    },
    steps: [
      "RSA Worked Numerical Example (p=3, q=11):",
      "1. Compute n = p × q = 3 × 11 = 33.",
      "2. Compute φ(n) = (p-1)(q-1) = 2 × 10 = 20.",
      "3. Choose e = 7 (since gcd(7, 20) = 1). Public Key = (7, 33).",
      "4. Compute d such that (7 × d) mod 20 = 1 ⟹ d = 3. Private Key = (3, 33).",
      "5. Encrypt Message M = 2: C = 2⁷ mod 33 = 128 mod 33 = 29.",
      "6. Decrypt Cipher C = 29: M = 29³ mod 33 = 24389 mod 33 = 2.",
    ],
    examPoints: [
      "Compute RSA Public Key, Private Key, Encryption C, and Decryption M for given prime numbers p, q, and e — guaranteed 10-marker.",
      "Explain SSL/TLS handshake for HTTPS secure connection setup.",
    ],
    memoryTrigger: "RSA: n=p·q, φ=(p-1)(q-1), e·d ≡ 1 mod φ. C = Mᵉ mod n, M = Cᵈ mod n.",
    keywords: ["RSA algorithm", "public key cryptography", "asymmetric encryption", "TLS handshake", "HTTPS"],
  },
];
