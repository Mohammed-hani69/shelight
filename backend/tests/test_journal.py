"""اختبارات المدونة العامة — القائمة والتفاصيل والتمييز واللغة."""
from __future__ import annotations


def test_list_articles_returns_published_sorted(client):
    response = client.get("/api/v1/journal")
    assert response.status_code == 200
    articles = response.get_json()["data"]
    assert len(articles) == 3
    # المميز أولاً.
    assert articles[0]["slug"] == "building-your-morning-skin-routine"
    assert articles[0]["isFeatured"] is True
    # بقية المقالات مرتّبة بالأحدث.
    dates = [a["publishDate"] for a in articles[1:]]
    assert dates == sorted(dates, reverse=True)
    sample = articles[0]
    assert sample["title"] and sample["excerpt"]
    assert isinstance(sample["content"], list) and sample["content"]
    assert sample["category"] and sample["author"] and sample["readTime"]
    assert sample["image"]


def test_article_detail_by_slug(client):
    response = client.get("/api/v1/journal/hair-repair-101-keratin-and-beyond")
    assert response.status_code == 200
    article = response.get_json()["data"]
    assert article["slug"] == "hair-repair-101-keratin-and-beyond"
    assert len(article["content"]) == 2


def test_article_localized_arabic(client):
    response = client.get("/api/v1/journal?lang=ar")
    assert response.status_code == 200
    article = response.get_json()["data"][0]
    assert article["title"] == "بناء روتينك الصباحي للبشرة"


def test_unknown_article_returns_404(client):
    response = client.get("/api/v1/journal/does-not-exist")
    assert response.status_code == 404
