"""اختبارات الكتالوج: القوائم، الفلاتر، الفرز، التفاصيل، الوسوم."""
from __future__ import annotations


def test_list_products_shape(client):
    response = client.get("/api/v1/products")
    assert response.status_code == 200
    body = response.get_json()
    assert body["meta"]["page"] == 1
    assert body["meta"]["total"] >= 9
    assert len(body["data"]) >= 9
    product = body["data"][0]
    assert product["id"]
    assert product["slug"]
    assert product["name"]
    assert product["price"] > 0
    assert "rating" in product
    assert "reviewCount" in product


def test_filter_by_category(client):
    response = client.get("/api/v1/products", query_string={"category": "skin-care"})
    data = response.get_json()["data"]
    assert data
    assert all(item["category"]["slug"] == "skin-care" for item in data)


def test_search_by_term(client):
    response = client.get("/api/v1/products", query_string={"search": "serum"})
    data = response.get_json()["data"]
    assert data
    assert all("serum" in item["slug"] for item in data)


def test_sort_price_asc(client):
    response = client.get("/api/v1/products", query_string={"sort": "price-asc", "size": 100})
    prices = [item["price"] for item in response.get_json()["data"]]
    assert prices == sorted(prices)


def test_product_detail(client):
    response = client.get("/api/v1/products/luminous-glow-serum")
    assert response.status_code == 200
    product = response.get_json()["data"]
    assert product["name"] == "Luminous Glow Serum"
    assert product["images"]
    assert product["benefits"]
    assert product["rating"] > 0
    assert product["reviewCount"] > 0


def test_product_not_found(client):
    response = client.get("/api/v1/products/not-a-real-product")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"


def test_tags_endpoint(client):
    response = client.get("/api/v1/products/tags")
    assert response.status_code == 200
    tags = response.get_json()["data"]
    assert isinstance(tags, list)
    assert "serum" in tags


def test_categories_tree(client):
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    roots = response.get_json()["data"]
    skin = next(category for category in roots if category["slug"] == "skin-care")
    assert skin["children"]
    assert all(child["slug"] for child in skin["children"])


def test_concerns_endpoint(client):
    response = client.get("/api/v1/concerns")
    assert response.status_code == 200
    slugs = {item["slug"] for item in response.get_json()["data"]}
    assert {"hydration", "glow", "keratin"} <= slugs


def test_sort_price_desc(client):
    response = client.get("/api/v1/products", query_string={"sort": "price-desc", "size": 100})
    prices = [item["price"] for item in response.get_json()["data"]]
    assert prices == sorted(prices, reverse=True)


def test_sort_rating(client):
    """`rating` كان يقود إلى الترتيب الافتراضي — الآن ينفّذ فعلياً."""
    response = client.get("/api/v1/products", query_string={"sort": "rating", "size": 100})
    data = response.get_json()["data"]
    ratings = [item["rating"] for item in data]
    assert ratings == sorted(ratings, reverse=True)


def test_sort_popularity(client):
    """`popularity` كان يقود إلى الترتيب الافتراضي — الآن ينفّذ فعلياً."""
    response = client.get("/api/v1/products", query_string={"sort": "popularity", "size": 100})
    assert response.status_code == 200
    counts = [item["reviewCount"] for item in response.get_json()["data"]]
    assert counts == sorted(counts, reverse=True)


def test_pagination_slices_results(client):
    """الصفحة الثانية يجب أن تعيد عناصر مختلفة عن الأولى."""
    first = client.get("/api/v1/products", query_string={"page_size": 3, "page": 1}).get_json()
    second = client.get("/api/v1/products", query_string={"page_size": 3, "page": 2}).get_json()
    first_slugs = {item["slug"] for item in first["data"]}
    second_slugs = {item["slug"] for item in second["data"]}
    assert first["meta"]["pageSize"] == 3
    assert first["meta"]["hasNextPage"] is True
    assert first_slugs and second_slugs
    assert not (first_slugs & second_slugs)


def test_lang_returns_arabic_copy(client):
    """`?lang=ar` يعيد الأسماء والأوصاف العربية، والإنجليزية هي الافتراضي."""
    en = client.get("/api/v1/products/luminous-glow-serum").get_json()["data"]
    ar = client.get(
        "/api/v1/products/luminous-glow-serum", query_string={"lang": "ar"}
    ).get_json()["data"]

    assert en["name"] == "Luminous Glow Serum"
    assert ar["name"] == "سيروم الإشراقة"
    assert ar["shortDescription"] != en["shortDescription"]
    assert ar["description"] != en["description"]
    assert ar["category"]["name"] == "العناية بالبشرة"
    assert ar["images"][0]["alt"] == "زجاجة سيروم الإشراقة"
    assert ar["slug"] == en["slug"]


def test_lang_list_and_categories(client):
    ar_products = client.get(
        "/api/v1/products", query_string={"lang": "ar", "page_size": 100}
    ).get_json()["data"]
    assert all(item["name"] != "" for item in ar_products)
    assert any("سيروم" in item["name"] for item in ar_products)

    ar_categories = client.get("/api/v1/categories", query_string={"lang": "ar"}).get_json()["data"]
    assert any(category["name"] == "العناية بالبشرة" for category in ar_categories)
    skin = next(c for c in ar_categories if c["slug"] == "skin-care")
    assert skin["children"]
    assert all(child["name"] for child in skin["children"])


def test_lang_falls_back_to_english_for_unsupported(client):
    """لغة غير مدعومة ترجع الإنجليزية بدل 500 — وتطابق ما يعيده `lang=en`."""
    unsupported = client.get("/api/v1/products", query_string={"lang": "fr"}).get_json()["data"]
    english = client.get("/api/v1/products", query_string={"lang": "en"}).get_json()["data"]
    assert unsupported
    assert {item["slug"]: item["name"] for item in unsupported} == {
        item["slug"]: item["name"] for item in english
    }


def test_newest_sort_is_deterministic(client):
    """كل منتجات البذرة تتشارك `created_at` — الترتيب يجب ألا يتغيّر بين الطلبات."""
    first = client.get("/api/v1/products", query_string={"sort": "newest", "size": 100})
    second = client.get("/api/v1/products", query_string={"sort": "newest", "size": 100})
    assert [i["slug"] for i in first.get_json()["data"]] == [
        i["slug"] for i in second.get_json()["data"]
    ]


def test_concerns_localized(client):
    ar = client.get("/api/v1/concerns", query_string={"lang": "ar"}).get_json()["data"]
    names = {item["slug"]: item["name"] for item in ar}
    assert names["hydration"] == "ترطيب"


def test_product_detail_by_id(client):
    """صفحة الأمنيات تحفظ المعرّفات الرقمية فقط فتحتاج جلباً بالمعرّف."""
    glow = client.get("/api/v1/products/luminous-glow-serum").get_json()["data"]
    product_id = glow["id"]

    response = client.get(f"/api/v1/products/id/{product_id}")
    assert response.status_code == 200
    assert response.get_json()["data"]["id"] == product_id
    assert response.get_json()["data"]["slug"] == "luminous-glow-serum"

    ar = client.get(
        f"/api/v1/products/id/{product_id}", query_string={"lang": "ar"}
    ).get_json()["data"]
    assert ar["name"] == "سيروم الإشراقة"


def test_product_detail_by_id_not_found(client):
    response = client.get("/api/v1/products/id/999999")
    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"


def test_slug_route_wins_over_id_route(client):
    """`/products/id` slug حقيقي يجب ألا يبتلعه مسار المعرّف."""
    response = client.get("/api/v1/products/id")
    assert response.status_code == 404