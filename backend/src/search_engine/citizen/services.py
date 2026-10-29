"""Catalog of the five citizen services covered by Index Nepal MVP."""

from __future__ import annotations

from dataclasses import dataclass

PASSPORT = "passport"
DRIVING_LICENCE = "driving-licence"
CITIZENSHIP = "citizenship"
BIRTH_REGISTRATION = "birth-registration"
MARRIAGE_REGISTRATION = "marriage-registration"

ALL_SLUGS: tuple[str, ...] = (
    PASSPORT,
    DRIVING_LICENCE,
    CITIZENSHIP,
    BIRTH_REGISTRATION,
    MARRIAGE_REGISTRATION,
)


@dataclass(frozen=True)
class CitizenService:
    slug: str
    name_en: str
    name_ne: str
    description_en: str
    keywords_en: tuple[str, ...]
    keywords_ne: tuple[str, ...]
    questions_en: tuple[str, ...]
    questions_ne: tuple[str, ...]
    official_sources: tuple[str, ...]


PASSPORT_QUESTIONS_EN = (
    "What documents do I need for a new passport?",
    "How much is the passport fee, and how long does it take?",
    "Where do I apply for a passport?",
)
PASSPORT_QUESTIONS_NE = (
    "नयाँ राहदानीका लागि कुन कागजात चाहिन्छ?",
    "राहदानी शुल्क कति लाग्छ र समय कति लाग्छ?",
    "राहदानी कहाँ दिनुपर्छ?",
)

LICENCE_QUESTIONS_EN = (
    "How do I renew my driving licence?",
    "What is the minimum age for a driving licence?",
    "Can I apply for a driving licence online?",
)
LICENCE_QUESTIONS_NE = (
    "सवारी चालक अनुमतिपत्र कसरी नवीकरण गर्ने?",
    "सवारी चालक अनुमतिपत्रको लागि न्यूनतम उमेर कति हो?",
    "सवारी चालक अनुमतिपत्र अनलाइन आवेदन दिन सकिन्छ?",
)

CITIZENSHIP_QUESTIONS_EN = (
    "How do I get a citizenship certificate?",
    "What documents are needed for a citizenship certificate?",
    "How much does citizenship cost?",
)
CITIZENSHIP_QUESTIONS_NE = (
    "नागरिकता प्रमाणपत्र कसरी पाउन सकिन्छ?",
    "नागरिकताका लागि कुन कागजात चाहिन्छ?",
    "नागरिकताको लागि कति शुल्क लाग्छ?",
)

BIRTH_QUESTIONS_EN = (
    "What documents are needed for birth registration?",
    "How long do I have to register a birth?",
    "Is birth registration free?",
)
BIRTH_QUESTIONS_NE = (
    "जन्म दर्ताका लागि कुन कागजात चाहिन्छ?",
    "जन्म दर्ता गर्न कति समय पाएको छ?",
    "जन्म दर्ता निःशुल्क छ?",
)

MARRIAGE_QUESTIONS_EN = (
    "Where and how do I register a marriage?",
    "What is the minimum age for marriage registration?",
    "What documents are needed for marriage registration?",
)
MARRIAGE_QUESTIONS_NE = (
    "विवाह कहाँ र कसरी दर्ता गर्ने?",
    "विवाह दर्ताको लागि न्यूनतम उमेर कति हो?",
    "विवाह दर्ताका लागि कुन कागजात चाहिन्छ?",
)

SERVICES: tuple[CitizenService, ...] = (
    CitizenService(
        slug=PASSPORT,
        name_en="Passport",
        name_ne="राहदानी",
        description_en="Apply for or renew an ordinary e-passport through the Department of Passports.",
        keywords_en=("passport", "passports", "e-passport", "renew passport", "renewal"),
        keywords_ne=("राहदानी", "राहदानीको", "पासपोर्ट", "नवीकरण"),
        questions_en=PASSPORT_QUESTIONS_EN,
        questions_ne=PASSPORT_QUESTIONS_NE,
        official_sources=("https://nepalpassport.gov.np/",),
    ),
    CitizenService(
        slug=DRIVING_LICENCE,
        name_en="Driving licence",
        name_ne="सवारी चालक अनुमतिपत्र",
        description_en="Apply for, renew, or check a smart-card driving licence through the Department of Transport Management.",
        keywords_en=("driving licence", "driving license", "licence", "license", "renewal", "renew", "test"),
        keywords_ne=("सवारी चालक अनुमतिपत्र", "चालक अनुमतिपत्र", "लाइसेन्स", "नवीकरण", "परीक्षा"),
        questions_en=LICENCE_QUESTIONS_EN,
        questions_ne=LICENCE_QUESTIONS_NE,
        official_sources=("https://dotm.gov.np/",),
    ),
    CitizenService(
        slug=CITIZENSHIP,
        name_en="Citizenship certificate",
        name_ne="नागरिकता प्रमाणपत्र",
        description_en="Apply for a Nepali citizenship certificate through the Ministry of Home Affairs / District Administration Office.",
        keywords_en=("citizenship", "citizenship certificate", "nagarikta"),
        keywords_ne=("नागरिकता", "नागरिकता प्रमाणपत्र", "प्रमाणपत्र"),
        questions_en=CITIZENSHIP_QUESTIONS_EN,
        questions_ne=CITIZENSHIP_QUESTIONS_NE,
        official_sources=("https://moha.gov.np/",),
    ),
    CitizenService(
        slug=BIRTH_REGISTRATION,
        name_en="Birth registration",
        name_ne="जन्म दर्ता",
        description_en="Register a birth through the Department of National ID and Civil Registration / local registrar.",
        keywords_en=("birth registration", "birth certificate", "register birth"),
        keywords_ne=("जन्म", "जन्म दर्ता", "जन्म प्रमाणपत्र"),
        questions_en=BIRTH_QUESTIONS_EN,
        questions_ne=BIRTH_QUESTIONS_NE,
        official_sources=("https://donidcr.gov.np/",),
    ),
    CitizenService(
        slug=MARRIAGE_REGISTRATION,
        name_en="Marriage registration",
        name_ne="विवाह दर्ता",
        description_en="Register a marriage through the Department of National ID and Civil Registration / local registrar.",
        keywords_en=("marriage registration", "marriage certificate", "register marriage"),
        keywords_ne=("विवाह", "विवाह दर्ता", "विवाह प्रमाणपत्र"),
        questions_en=MARRIAGE_QUESTIONS_EN,
        questions_ne=MARRIAGE_QUESTIONS_NE,
        official_sources=("https://donidcr.gov.np/",),
    ),
)

SERVICE_BY_SLUG: dict[str, CitizenService] = {service.slug: service for service in SERVICES}


def get_service(slug: str) -> CitizenService | None:
    return SERVICE_BY_SLUG.get(slug)
