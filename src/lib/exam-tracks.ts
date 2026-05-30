// lib/exam-tracks.ts
// Static exam track data used for onboarding search and category selection.
// MVP includes CISSP only; additional tracks are listed as placeholders for future use.

import type { ExamTrack } from "./types";

export const EXAM_CATEGORIES = [
  { id: "it-cybersecurity", label: "IT & Cybersecurity" },
  { id: "healthcare", label: "Healthcare" },
  { id: "trade-vocational", label: "Trade & Vocational" },
  { id: "language", label: "Language Proficiency" },
  { id: "college-admissions", label: "College Admissions" },
  { id: "professional-licensing", label: "Professional Licensing" },
  { id: "other", label: "Other" },
] as const;

export type ExamCategoryId = (typeof EXAM_CATEGORIES)[number]["id"];

/**
 * All exam tracks. MVP: only CISSP is fully built out.
 * Others are listed so the search/typeahead feels real during onboarding.
 */
export const EXAM_TRACKS: ExamTrack[] = [
  {
    id: "cissp",
    name: "CISSP",
    fullName: "Certified Information Systems Security Professional",
    category: "it-cybersecurity",
    domainCount: 8,
    domains: [
      { id: "srm", name: "Security and Risk Management", weight: 15 },
      { id: "as", name: "Asset Security", weight: 10 },
      { id: "sae", name: "Security Architecture and Engineering", weight: 13 },
      { id: "cns", name: "Communication and Network Security", weight: 13 },
      { id: "iam", name: "Identity and Access Management (IAM)", weight: 13 },
      { id: "sat", name: "Security Assessment and Testing", weight: 12 },
      { id: "so", name: "Security Operations", weight: 13 },
      { id: "sds", name: "Software Development Security", weight: 11 },
    ],
    passingScore: "700/1000",
    examDuration: "3–6 hours (CAT)",
    description:
      "The CISSP is a globally recognized certification in information security, covering 8 domains from risk management to software development security.",
  },
  // ── Future tracks (search placeholders) ──────────────────────
  {
    id: "security-plus",
    name: "Security+",
    fullName: "CompTIA Security+",
    category: "it-cybersecurity",
    domainCount: 5,
    domains: [],
    passingScore: "750/900",
    examDuration: "90 minutes",
    description: "Entry-level cybersecurity certification by CompTIA.",
  },
  {
    id: "pmp",
    name: "PMP",
    fullName: "Project Management Professional",
    category: "professional-licensing",
    domainCount: 3,
    domains: [],
    passingScore: "Pass/Fail",
    examDuration: "230 minutes",
    description: "Project management certification by PMI.",
  },
  {
    id: "toefl",
    name: "TOEFL",
    fullName: "Test of English as a Foreign Language",
    category: "language",
    domainCount: 4,
    domains: [],
    passingScore: "Varies by institution",
    examDuration: "3+ hours",
    description: "English language proficiency test for non-native speakers.",
  },
  {
    id: "ielts",
    name: "IELTS",
    fullName: "International English Language Testing System",
    category: "language",
    domainCount: 4,
    domains: [],
    passingScore: "Band score varies",
    examDuration: "2 hours 45 minutes",
    description: "English proficiency test accepted worldwide.",
  },
  {
    id: "nclex",
    name: "NCLEX",
    fullName: "National Council Licensure Examination",
    category: "healthcare",
    domainCount: 4,
    domains: [],
    passingScore: "Pass/Fail (CAT)",
    examDuration: "Up to 5 hours",
    description: "Nursing licensure exam required in the US and Canada.",
  },
  {
    id: "sat",
    name: "SAT",
    fullName: "Scholastic Assessment Test",
    category: "college-admissions",
    domainCount: 2,
    domains: [],
    passingScore: "400–1600 scale",
    examDuration: "2 hours 14 minutes",
    description: "College admissions test in reading/writing and math.",
  },
  {
    id: "ged",
    name: "GED",
    fullName: "General Educational Development",
    category: "college-admissions",
    domainCount: 4,
    domains: [],
    passingScore: "145 per subject",
    examDuration: "7+ hours total",
    description: "High school equivalency credential.",
  },
  {
    id: "hvac",
    name: "HVAC Licensing",
    fullName: "HVAC Technician Licensing Exam",
    category: "trade-vocational",
    domainCount: 0,
    domains: [],
    passingScore: "Varies by state",
    examDuration: "Varies",
    description: "Trade licensing for HVAC technicians.",
  },
  {
    id: "real-estate",
    name: "Real Estate Licensing",
    fullName: "Real Estate Salesperson/Broker Exam",
    category: "professional-licensing",
    domainCount: 0,
    domains: [],
    passingScore: "Varies by state",
    examDuration: "Varies",
    description: "State licensing exam for real estate professionals.",
  },
];

/**
 * Find exam tracks matching a search query (case-insensitive).
 */
export function searchExamTracks(query: string): ExamTrack[] {
  const q = query.toLowerCase().trim();
  if (!q) return EXAM_TRACKS;
  return EXAM_TRACKS.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.fullName.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
  );
}

/**
 * Filter exam tracks by category.
 */
export function getTracksByCategory(categoryId: string): ExamTrack[] {
  return EXAM_TRACKS.filter((t) => t.category === categoryId);
}

/**
 * Get a single track by ID.
 */
export function getTrackById(id: string): ExamTrack | undefined {
  return EXAM_TRACKS.find((t) => t.id === id);
}
