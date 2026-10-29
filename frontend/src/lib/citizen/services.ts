export interface CitizenServiceDisplay {
  slug: string;
  name: string;
  nameNe: string;
  description: string;
  questions: string[];
  officialSources: string[];
}

export const CITIZEN_SERVICES: CitizenServiceDisplay[] = [
  {
    slug: "passport",
    name: "Passport",
    nameNe: "राहदानी",
    description:
      "Apply for or renew an ordinary e-passport through the Department of Passports.",
    questions: [
      "What documents do I need for a new passport?",
      "How much is the passport fee, and how long does it take?",
      "Where do I apply for a passport?",
    ],
    officialSources: ["https://nepalpassport.gov.np/"],
  },
  {
    slug: "driving-licence",
    name: "Driving licence",
    nameNe: "सवारी चालक अनुमतिपत्र",
    description:
      "Apply for, renew, or check a smart-card driving licence through the Department of Transport Management.",
    questions: [
      "How do I renew my driving licence?",
      "What is the minimum age for a driving licence?",
      "Can I apply for a driving licence online?",
    ],
    officialSources: ["https://dotm.gov.np/"],
  },
  {
    slug: "citizenship",
    name: "Citizenship certificate",
    nameNe: "नागरिकता प्रमाणपत्र",
    description:
      "Apply for a Nepali citizenship certificate through the Ministry of Home Affairs.",
    questions: [
      "How do I get a citizenship certificate?",
      "What documents are needed for a citizenship certificate?",
      "How much does citizenship cost?",
    ],
    officialSources: ["https://moha.gov.np/"],
  },
  {
    slug: "birth-registration",
    name: "Birth registration",
    nameNe: "जन्म दर्ता",
    description:
      "Register a birth through the Department of National ID and Civil Registration.",
    questions: [
      "What documents are needed for birth registration?",
      "How long do I have to register a birth?",
      "Is birth registration free?",
    ],
    officialSources: ["https://donidcr.gov.np/"],
  },
  {
    slug: "marriage-registration",
    name: "Marriage registration",
    nameNe: "विवाह दर्ता",
    description:
      "Register a marriage through the Department of National ID and Civil Registration.",
    questions: [
      "Where and how do I register a marriage?",
      "What is the minimum age for marriage registration?",
      "What documents are needed for marriage registration?",
    ],
    officialSources: ["https://donidcr.gov.np/"],
  },
];

export const CITIZEN_SERVICE_BY_SLUG: Record<string, CitizenServiceDisplay> = Object.fromEntries(
  CITIZEN_SERVICES.map((s) => [s.slug, s]),
);

export function getCitizenService(slug: string): CitizenServiceDisplay | undefined {
  return CITIZEN_SERVICE_BY_SLUG[slug];
}

export const CITIZEN_SERVICE_SLUGS: string[] = CITIZEN_SERVICES.map((s) => s.slug);
