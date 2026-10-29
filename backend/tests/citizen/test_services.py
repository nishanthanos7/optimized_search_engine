from search_engine.citizen.services import SERVICE_BY_SLUG, SERVICES, get_service


def test_catalog_has_exactly_five_unique_services():
    assert [service.slug for service in SERVICES] == [
        "passport",
        "driving-licence",
        "citizenship",
        "birth-registration",
        "marriage-registration",
    ]
    assert len(SERVICE_BY_SLUG) == 5


def test_each_service_has_bilingual_keywords_and_questions():
    for service in SERVICES:
        assert service.name_en
        assert service.name_ne
        assert service.keywords_en
        assert service.keywords_ne
        assert service.questions_en
        assert service.questions_ne


def test_get_service_returns_none_for_unknown_slug():
    assert get_service("unknown") is None
    assert get_service("passport").name_en == "Passport"
