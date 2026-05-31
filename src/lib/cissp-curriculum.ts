// lib/cissp-curriculum.ts
// CISSP curriculum content for all 8 domains.
// Based on public (ISC)² exam objectives — all content is original.

import type { CurriculumDomain } from "./types";

export const CISSP_CURRICULUM: CurriculumDomain[] = [
  {
    id: "srm",
    examId: "cissp",
    name: "Security and Risk Management",
    weight: 15,
    concepts: [
      "Confidentiality, integrity, and availability (CIA triad)",
      "Security governance principles",
      "Compliance and regulatory requirements",
      "Legal and regulatory issues (GDPR, HIPAA, SOX)",
      "Professional ethics and (ISC)² Code of Ethics",
      "Security policies, standards, procedures, and guidelines",
      "Business continuity planning (BCP)",
      "Risk management concepts (risk identification, assessment, mitigation)",
      "Threat modeling methodologies (STRIDE, PASTA, DREAD)",
      "Supply chain risk management",
      "Security awareness, education, and training",
    ],
    terminology: [
      "Due care", "Due diligence", "Risk appetite", "Risk tolerance",
      "Residual risk", "Inherent risk", "Qualitative risk analysis",
      "Quantitative risk analysis", "ALE (Annual Loss Expectancy)",
      "SLE (Single Loss Expectancy)", "ARO (Annual Rate of Occurrence)",
      "RPO (Recovery Point Objective)", "RTO (Recovery Time Objective)",
      "BIA (Business Impact Analysis)", "MTBF", "MTTR",
    ],
    learningObjectives: [
      "Apply security governance principles to organizational operations",
      "Determine compliance and regulatory requirements",
      "Understand legal and regulatory issues pertaining to information security",
      "Develop, document, and implement security policies and procedures",
      "Identify and analyze risk using qualitative and quantitative methods",
      "Apply risk management frameworks and threat modeling",
      "Establish and maintain a security awareness program",
    ],
    scenarioTemplates: [
      "An organization discovers a new regulatory requirement. As CISO, what is your FIRST action?",
      "During a risk assessment, you identify a vulnerability with high impact but low likelihood. How do you prioritize this?",
      "A third-party vendor has experienced a data breach affecting your supply chain. What is the BEST course of action?",
    ],
  },
  {
    id: "as",
    examId: "cissp",
    name: "Asset Security",
    weight: 10,
    concepts: [
      "Information and asset classification",
      "Asset ownership and accountability",
      "Privacy protection and data sovereignty",
      "Data retention, handling, and disposal",
      "Data security controls (encryption, masking, tokenization)",
      "Data states: at rest, in transit, in use",
      "Data lifecycle management",
      "Data remanence and secure destruction",
    ],
    terminology: [
      "Data owner", "Data custodian", "Data controller", "Data processor",
      "Data classification levels", "PII (Personally Identifiable Information)",
      "PHI (Protected Health Information)", "Data remanence",
      "Sanitization", "Degaussing", "Cryptographic erasure",
    ],
    learningObjectives: [
      "Classify information and assets based on sensitivity and criticality",
      "Establish asset handling requirements throughout the data lifecycle",
      "Apply privacy protection methods appropriate to the data type",
      "Ensure proper data retention and secure disposal procedures",
    ],
    scenarioTemplates: [
      "Your organization is decommissioning servers containing classified data. What is the MOST secure disposal method?",
      "A department stores PII without proper classification labels. What should you address FIRST?",
    ],
  },
  {
    id: "sae",
    examId: "cissp",
    name: "Security Architecture and Engineering",
    weight: 13,
    concepts: [
      "Security models (Bell-LaPadula, Biba, Clark-Wilson, Brewer-Nash)",
      "Security architecture frameworks (TOGAF, SABSA, Zachman)",
      "Secure design principles (defense in depth, least privilege, separation of duties)",
      "Cryptography fundamentals (symmetric, asymmetric, hashing)",
      "PKI and certificate management",
      "Physical security controls",
      "Site and facility design considerations",
      "Vulnerability of security architectures",
      "Cloud security architecture (IaaS, PaaS, SaaS models)",
    ],
    terminology: [
      "TCB (Trusted Computing Base)", "Reference monitor",
      "Security kernel", "State machine model", "MAC (Mandatory Access Control)",
      "DAC (Discretionary Access Control)", "AES", "RSA", "ECC",
      "Digital signature", "Hash function", "HMAC", "PKI", "CA (Certificate Authority)",
    ],
    learningObjectives: [
      "Apply security design principles in architecture and engineering",
      "Understand fundamental concepts of security models",
      "Select appropriate cryptographic solutions for given scenarios",
      "Design and implement physical security controls",
      "Assess and mitigate vulnerabilities in security architectures",
    ],
    scenarioTemplates: [
      "You need to protect data confidentiality in a multi-level secure environment. Which security model is MOST appropriate?",
      "An application requires both encryption at rest and integrity verification. What combination of controls do you implement?",
    ],
  },
  {
    id: "cns",
    examId: "cissp",
    name: "Communication and Network Security",
    weight: 13,
    concepts: [
      "OSI and TCP/IP models",
      "Network protocols and services (DNS, DHCP, HTTP/S, TLS/SSL)",
      "Network segmentation and micro-segmentation",
      "Secure network components (firewalls, IDS/IPS, proxies, VPN)",
      "Wireless security (WPA3, 802.1X)",
      "Network attacks and countermeasures (DDoS, MITM, ARP spoofing)",
      "Software-defined networking (SDN) and zero trust architecture",
      "Secure communication channels and email security",
    ],
    terminology: [
      "VLAN", "DMZ", "NAT", "VPN", "IPSec", "TLS", "SSL",
      "IDS (Intrusion Detection System)", "IPS (Intrusion Prevention System)",
      "SIEM", "Zero trust", "Micro-segmentation", "East-west traffic",
      "North-south traffic", "802.1X", "RADIUS", "TACACS+",
    ],
    learningObjectives: [
      "Design and implement secure network architectures",
      "Secure network components and communication channels",
      "Prevent and mitigate network-based attacks",
      "Implement network monitoring and intrusion detection",
    ],
    scenarioTemplates: [
      "Users report intermittent connectivity issues and unexpected certificate warnings. What type of attack should you investigate FIRST?",
      "You are designing a network for a new office with regulatory requirements for data segmentation. What approach provides the STRONGEST isolation?",
    ],
  },
  {
    id: "iam",
    examId: "cissp",
    name: "Identity and Access Management (IAM)",
    weight: 13,
    concepts: [
      "Identification, authentication, and authorization",
      "Multi-factor authentication (MFA)",
      "Single sign-on (SSO) and federated identity",
      "Access control models (RBAC, ABAC, MAC, DAC)",
      "Identity lifecycle management (provisioning, deprovisioning)",
      "Privilege access management (PAM)",
      "Identity as a Service (IDaaS)",
      "Session management and credential management",
    ],
    terminology: [
      "Authentication factors (something you know/have/are)",
      "SAML", "OAuth", "OIDC", "LDAP", "Kerberos",
      "Role-based access control (RBAC)",
      "Attribute-based access control (ABAC)",
      "Principle of least privilege", "Need-to-know",
      "Privileged access workstation (PAW)", "Just-in-time access",
    ],
    learningObjectives: [
      "Implement and manage identification and authentication mechanisms",
      "Design access control architectures appropriate to requirements",
      "Manage the identity lifecycle from provisioning to deprovisioning",
      "Implement and manage authorization mechanisms",
    ],
    scenarioTemplates: [
      "An employee transfers departments but retains access to previous systems. What IAM process failure does this represent?",
      "You need to implement access control for a system where permissions depend on user role, location, and time of day. Which model is BEST?",
    ],
  },
  {
    id: "sat",
    examId: "cissp",
    name: "Security Assessment and Testing",
    weight: 12,
    concepts: [
      "Vulnerability assessment and management",
      "Penetration testing methodologies",
      "Security audits (internal and external)",
      "Log management and analysis",
      "Security control testing (SOC reports, ISO audits)",
      "Software testing methods (SAST, DAST, fuzzing)",
      "Key performance and risk indicators (KPIs, KRIs)",
      "Third-party assessment and audit reporting",
    ],
    terminology: [
      "Vulnerability scan", "Penetration test", "Red team", "Blue team",
      "Purple team", "SOC 1/2/3 reports", "CVSS", "CVE",
      "SAST (Static Application Security Testing)",
      "DAST (Dynamic Application Security Testing)",
      "Fuzzing", "Code review", "Tabletop exercise",
    ],
    learningObjectives: [
      "Design and validate assessment, test, and audit strategies",
      "Conduct and analyze vulnerability assessments",
      "Understand penetration testing scope, rules of engagement, and methodology",
      "Collect and analyze security process data",
    ],
    scenarioTemplates: [
      "Your annual penetration test reveals a critical vulnerability in a production system. What is your FIRST step?",
      "Management requests a security assessment of a cloud-hosted application. What combination of testing provides the MOST comprehensive coverage?",
    ],
  },
  {
    id: "so",
    examId: "cissp",
    name: "Security Operations",
    weight: 13,
    concepts: [
      "Incident management and response",
      "Digital forensics and evidence handling",
      "Disaster recovery planning and testing",
      "Business continuity operations",
      "Logging, monitoring, and alerting",
      "Change and configuration management",
      "Patch and vulnerability management",
      "Physical security operations",
      "Personnel safety and security",
    ],
    terminology: [
      "Incident response lifecycle (preparation, detection, containment, eradication, recovery, lessons learned)",
      "Chain of custody", "Order of volatility", "Mean time to detect (MTTD)",
      "Mean time to respond (MTTR)", "SOC (Security Operations Center)",
      "SOAR", "Playbook", "Runbook", "Hot site", "Warm site", "Cold site",
      "DRP (Disaster Recovery Plan)",
    ],
    learningObjectives: [
      "Conduct incident management and response operations",
      "Apply digital forensics principles and evidence handling",
      "Implement and test disaster recovery plans",
      "Manage and operate security monitoring and alerting systems",
      "Apply change management and configuration management practices",
    ],
    scenarioTemplates: [
      "A suspected data breach has occurred. After confirming the incident, what is the NEXT step in the incident response process?",
      "During disaster recovery testing, the failover site fails to meet RTO. What should you recommend?",
    ],
  },
  {
    id: "sds",
    examId: "cissp",
    name: "Software Development Security",
    weight: 11,
    concepts: [
      "Secure software development lifecycle (SSDLC)",
      "Software development methodologies (Agile, DevSecOps, Waterfall)",
      "Application security controls (input validation, output encoding)",
      "OWASP Top 10 vulnerabilities",
      "Secure coding practices",
      "Database security (SQL injection prevention, encryption)",
      "API security",
      "Software acquisition and supply chain security",
      "Code repository security",
    ],
    terminology: [
      "SDLC", "DevSecOps", "Shift left", "OWASP",
      "SQL injection", "XSS (Cross-site scripting)", "CSRF",
      "Input validation", "Output encoding", "Parameterized queries",
      "Code signing", "Dependency scanning", "SBOM (Software Bill of Materials)",
    ],
    learningObjectives: [
      "Integrate security into the software development lifecycle",
      "Apply secure coding guidelines and standards",
      "Identify and mitigate common software vulnerabilities",
      "Assess the security of acquired software and third-party components",
    ],
    scenarioTemplates: [
      "A development team is adopting DevSecOps. What security activity should be integrated EARLIEST in the pipeline?",
      "A web application is vulnerable to SQL injection. What is the MOST effective remediation?",
    ],
  },
];

/**
 * Get curriculum for a specific domain.
 */
export function getCurriculumByDomain(domainId: string): CurriculumDomain | undefined {
  return CISSP_CURRICULUM.find((d) => d.id === domainId);
}

/**
 * Get all domain names and IDs for display.
 */
export function getDomainList(): { id: string; name: string; weight: number }[] {
  return CISSP_CURRICULUM.map((d) => ({ id: d.id, name: d.name, weight: d.weight }));
}
