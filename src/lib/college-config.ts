export interface CollegeConfig {
  officialName: string;
  shortName: string;
  abbreviation: string;
  alternateNames: string[];
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  email: string;
  emailAlt: string;
  phone: string;
  domain: string;
  baseUrl: string;
  logoPath: string;
  establishedYear: string;
  accreditation: string;
  affiliation: string;
  portalPurpose: string;
  primaryCTA: string;
  secondaryCTA: string;
}

export const COLLEGE: CollegeConfig = {
  officialName: "JNTUH University College of Engineering Jagtial",
  shortName: "JNTUH UCEJ",
  abbreviation: "JNTUH UCEJ",
  alternateNames: [
    "JNTUH UCEJ",
    "JNTUCEJ",
    "jntuhcej",
    "JNTUH College of Engineering Jagtial",
    "JNTU College of Engineering Jagtial",
    "JNTUH University College of Engineering, Jagtial",
  ],
  addressLine1: "Nachupally (Kondagattu), Kodimial (M)",
  addressLine2: "Jagtial District",
  city: "Jagtial",
  state: "Telangana",
  pincode: "505501",
  country: "IN",
  email: "cej@jntuh.ac.in",
  emailAlt: "principal@jntuhcej.ac.in",
  phone: "6302503548",
  domain: "monitor.cej.in",
  baseUrl: "https://monitor.cej.in",
  logoPath: "/logo.png",
  establishedYear: "2007",
  accreditation:
    "NAAC A+ (CGPA 3.29, 2022); NBA-accredited UG programmes in EEE, ME and CSE; AICTE-approved; UGC 2(f) & 12(B)",
  affiliation:
    "Autonomous constituent college of Jawaharlal Nehru Technological University Hyderabad (JNTUH)",
  portalPurpose:
    "Official campus access, movement records, permissions and role-based services for students, parents, faculty, staff, wardens and administrators of JNTUH University College of Engineering Jagtial.",
  primaryCTA: "Sign in to campus portal",
  secondaryCTA: "Help & FAQ",
};

export function collegeCanonical(path = "/"): string {
  return `${COLLEGE.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function collegeDisplayName(): string {
  return COLLEGE.officialName;
}

export function collegeAlternateDisplay(): string {
  return `${COLLEGE.abbreviation} · ${COLLEGE.shortName}`;
}
