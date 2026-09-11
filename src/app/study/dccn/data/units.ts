import type { DccnUnit, UnitId } from "./types";

export const DCCN_UNITS: Record<UnitId, DccnUnit> = {
  I: {
    id: "I",
    title: "Unit I — Physical & Data Link Layer Fundamentals",
    subtitle: "OSI vs TCP/IP · CRC · Hamming Distance · Sliding Window Protocols",
    description: "OSI 7-layer reference model, TCP/IP stack, CRC error detection, Hamming error correction, Stop-and-Wait, Go-Back-N, Selective Repeat ARQ.",
    categories: [
      { name: "Layer Models", topicIds: ["osi-vs-tcpip-model"] },
      { name: "Error & Flow Control", topicIds: ["crc-error-detection", "sliding-window-arq"] },
    ],
  },
  II: {
    id: "II",
    title: "Unit II — Medium Access Control (MAC) & Ethernet",
    subtitle: "CSMA/CD · CSMA/CA · Ethernet Standards · Switching",
    description: "Random access protocols (ALOHA, CSMA/CD, CSMA/CA), collision detection/avoidance, IEEE 802.3 Ethernet frame structure, and Layer 2 switching.",
    categories: [
      { name: "MAC Protocols", topicIds: ["csma-cd-vs-ca"] },
    ],
  },
  III: {
    id: "III",
    title: "Unit III — Network Layer & IP Routing",
    subtitle: "IPv4 / IPv6 Subnetting · Distance Vector · Link State (OSPF) · ARP/ICMP",
    description: "IPv4 addressing and VLSM subnetting, CIDR notation, Distance Vector (RIP), Link State (OSPF) routing algorithms, ARP, RARP, ICMP, and NAT.",
    categories: [
      { name: "IP Addressing", topicIds: ["ipv4-subnetting-vlsm"] },
      { name: "Routing Algorithms", topicIds: ["distance-vector-vs-link-state"] },
    ],
  },
  IV: {
    id: "IV",
    title: "Unit IV — Transport Layer & Congestion Control",
    subtitle: "TCP 3-Way Handshake · UDP · TCP Congestion Control (AIMD) · Leaky/Token Bucket",
    description: "TCP segment format, 3-way handshake connection establishment, TCP congestion control (Slow Start, Congestion Avoidance, Fast Retransmit, AIMD), Leaky & Token Bucket traffic shaping.",
    categories: [
      { name: "Transport Protocols", topicIds: ["tcp-vs-udp-handshake"] },
      { name: "Traffic Shaping", topicIds: ["leaky-vs-token-bucket"] },
    ],
  },
  V: {
    id: "V",
    title: "Unit V — Application Layer & Network Security",
    subtitle: "DNS · HTTP/HTTPS · SMTP · RSA Encryption · Firewalls & TLS",
    description: "Domain Name System (DNS), HTTP/1.1 vs HTTP/2 vs HTTP/3, RSA asymmetric cryptography, Digital Signatures, Firewalls, SSL/TLS handshake.",
    categories: [
      { name: "Application Protocols", topicIds: ["dns-http-https"] },
      { name: "Network Security", topicIds: ["rsa-cryptography-tls"] },
    ],
  },
};
