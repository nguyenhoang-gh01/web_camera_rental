#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT_DIR = Path(__file__).resolve().parents[1]
PROJECT_DATA_DIR = ROOT_DIR / "project-data" / "actual-api"
RAW_DIR = PROJECT_DATA_DIR / "raw"
RAW_PRODUCTS_DIR = RAW_DIR / "products"
RAW_PRODUCT_DETAILS_DIR = RAW_DIR / "product-details"
RAW_SUGGESTIONS_DIR = RAW_DIR / "suggestions"

PUBLIC_DIR = ROOT_DIR / "public"
ASSET_DIR = PUBLIC_DIR / "assets" / "catalog"
CATEGORY_ASSET_DIR = ASSET_DIR / "category"
COMPANY_ASSET_DIR = ASSET_DIR / "company"
PRODUCT_ASSET_DIR = ASSET_DIR / "product"

SEED_SQL_FILE = ROOT_DIR / "database" / "seeds" / "catalog_seed.sql"
SCHEMA_FILE = ROOT_DIR / "database" / "schema.sql"
API_BASE = "https://api.dathanhcamera.com"
HEADERS = {
    "User-Agent": "FOCUS-CAMERA-Sync/1.0",
    "Accept": "application/json, text/plain, */*",
}

SUPPORTED_CATEGORIES = [
    {
        "id": 1,
        "slug": "thue-camera-may-anh",
        "name": "Thuê Camera (Máy ảnh)",
        "fallbackImageSource": f"{API_BASE}/image/category/5c3cbcdd3c05d76fb8f17e41213be0fcd3193c3b268c79b2f1.jpeg",
    },
    {
        "id": 5,
        "slug": "thue-lens-ong-kinh",
        "name": "Thuê Lens (Ống kính)",
        "fallbackImageSource": f"{API_BASE}/image/category/a1c2d01ca7e13205eaee2af1d4415b6f78e374e883a661761b.jpeg",
    },
    {
        "id": 6,
        "slug": "thue-phu-kien",
        "name": "Thuê Phụ kiện",
        "fallbackImageSource": f"{API_BASE}/image/category/534273b8dd29a62bbc85f0de4f05e2a0f7feb51b3a27ae6cf3.jpeg",
    },
]


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: Any) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def fetch_json(url: str) -> Any:
    request = Request(url, headers=HEADERS)
    with urlopen(request, timeout=60) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        content = response.read().decode(charset, errors="replace")
    return json.loads(content)


def split_images(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    return [item.strip() for item in str(value or "").split(",") if item.strip()]


def build_company_image_source(filename: str) -> str:
    return f"{API_BASE}/image/company/{filename}"


def build_product_image_source(product_id: Any, filename: str) -> str:
    return f"{API_BASE}/image/product/{product_id}/{filename}"


def to_public_url(path: Path) -> str:
    relative = path.relative_to(PUBLIC_DIR)
    return "/" + relative.as_posix()


def sanitize_filename(name: str, fallback: str) -> str:
    value = "".join(character for character in str(name) if character.isalnum() or character in "._-")
    return value or fallback


def parse_int(value: Any, default: int = 0) -> int:
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return default


def parse_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return default


def download_binary(url: str, target_path: Path) -> None:
    ensure_directory(target_path.parent)

    if target_path.exists():
        return

    request = Request(
        url,
        headers={
            "User-Agent": HEADERS["User-Agent"],
            "Accept": "*/*",
        },
    )
    with urlopen(request, timeout=120) as response, target_path.open("wb") as output:
        shutil.copyfileobj(response, output)


def sync_image(url: str, target_path: Path) -> str:
    if not url:
        return ""

    download_binary(url, target_path)
    return to_public_url(target_path)


def category_map() -> dict[int, dict[str, Any]]:
    return {int(category["id"]): category for category in SUPPORTED_CATEGORIES}


def fetch_supported_companies() -> list[dict[str, Any]]:
    payload = fetch_json(f"{API_BASE}/v1/company")
    write_json(RAW_DIR / "companies.json", payload)
    supported_ids = set(category_map().keys())

    companies = []
    for item in payload.get("data", []):
        category_id = parse_int(item.get("category_id"))
        if category_id not in supported_ids:
            continue
        companies.append(item)

    return companies


def fetch_price_rules() -> list[dict[str, Any]]:
    payload = fetch_json(f"{API_BASE}/v1/price")
    write_json(RAW_DIR / "price-rules.json", payload)
    return payload.get("data", [])


def fetch_category_products(category_id: int) -> list[dict[str, Any]]:
    url = (
        f"{API_BASE}/v1/product?status=1&category_id={category_id}"
        "&company_id=&orderBy=DESC&search=&page=1&total_page=0"
    )
    payload = fetch_json(url)
    write_json(RAW_PRODUCTS_DIR / f"category-{category_id}.json", payload)
    data = payload.get("data") or {}
    results = data.get("results") if isinstance(data, dict) else []
    return results or []


def fetch_product_detail(slug: str) -> dict[str, Any]:
    payload = fetch_json(f"{API_BASE}/v1/product/{quote(slug)}")
    write_json(RAW_PRODUCT_DETAILS_DIR / f"{slug}.json", payload)
    data = payload.get("data")
    if isinstance(data, list):
        return data[0] if data else {}
    return data or {}


def fetch_suggestions(product_id: Any, slug: str) -> list[dict[str, Any]]:
    payload = fetch_json(f"{API_BASE}/v1/suggest?suggest.product_id={product_id}")
    write_json(RAW_SUGGESTIONS_DIR / f"{slug}.json", payload)
    return payload.get("data") or []


def build_categories() -> list[dict[str, Any]]:
    categories = []
    for index, category in enumerate(SUPPORTED_CATEGORIES, start=1):
        source = category["fallbackImageSource"]
        filename = sanitize_filename(Path(source).name, f"category-{category['id']}.jpg")
        target = CATEGORY_ASSET_DIR / filename
        categories.append(
            {
                "id": parse_int(category["id"]),
                "slug": category["slug"],
                "name": category["name"],
                "fallbackImage": sync_image(source, target),
                "fallbackImageSource": source,
                "sortOrder": index,
            }
        )
    return categories


def build_companies(raw_companies: list[dict[str, Any]]) -> list[dict[str, Any]]:
    companies = []
    for item in raw_companies:
        image_name = str(item.get("image") or "").strip()
        image_source = build_company_image_source(image_name) if image_name else ""
        target = COMPANY_ASSET_DIR / sanitize_filename(image_name, f"company-{item['id']}.jpg")
        companies.append(
            {
                "id": parse_int(item.get("id")),
                "name": item.get("name") or "Khác",
                "categoryIds": [parse_int(item.get("category_id"))],
                "imageUrl": sync_image(image_source, target) if image_source else "",
                "sourceImageUrl": image_source,
            }
        )
    return companies


def build_price_rules(raw_price_rules: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized = []
    for item in raw_price_rules:
        normalized.append(
            {
                "total": parse_int(item.get("total"), 1),
                "percent": round(parse_float(item.get("percent"), 100.0), 2),
            }
        )
    return sorted(normalized, key=lambda item: item["total"])


def normalize_product(
    raw_product: dict[str, Any],
    category_lookup: dict[int, dict[str, Any]],
    company_lookup: dict[int, dict[str, Any]],
) -> dict[str, Any]:
    category_id = parse_int(raw_product.get("category_id") or raw_product.get("categoryId"))
    company_id = parse_int(raw_product.get("company_id") or raw_product.get("companyId"))
    category = category_lookup.get(category_id, {})
    company = company_lookup.get(company_id, {})

    image_urls: list[str] = []
    for index, image_name in enumerate(split_images(raw_product.get("images"))):
        filename = sanitize_filename(image_name, f"{raw_product.get('id')}-{index}.jpg")
        target = PRODUCT_ASSET_DIR / str(raw_product.get("id")) / filename
        source = (
            image_name
            if image_name.startswith("http")
            else build_product_image_source(raw_product.get("id"), image_name)
        )
        image_urls.append(sync_image(source, target))

    if not image_urls and category.get("fallbackImage"):
        image_urls = [category["fallbackImage"]]

    company_image_source = ""
    raw_company_image = str(raw_product.get("company_image") or "").strip()
    if raw_company_image:
        company_image_source = build_company_image_source(raw_company_image)

    company_image_url = company.get("imageUrl") or ""
    if company_image_source and not company_image_url:
        company_image_url = sync_image(
            company_image_source,
            COMPANY_ASSET_DIR / sanitize_filename(raw_company_image, f"company-{company_id}.jpg"),
        )

    price = parse_int(raw_product.get("price"))
    session_price = round((price * 0.7) / 1000) * 1000

    return {
        "id": str(raw_product.get("id")),
        "slug": raw_product.get("slug"),
        "name": raw_product.get("name"),
        "price": price,
        "sessionPrice": session_price,
        "categoryId": category_id,
        "categorySlug": category.get("slug", ""),
        "categoryName": category.get("name", ""),
        "companyId": company_id,
        "companyName": company.get("name") or raw_product.get("company_name") or "Khác",
        "companyImageUrl": company_image_url,
        "images": image_urls,
        "thumbnailUrl": image_urls[0] if image_urls else category.get("fallbackImage", ""),
        "description": raw_product.get("description")
        or "<p>Đang cập nhật thông tin nổi bật của sản phẩm.</p>",
        "detail": raw_product.get("detail")
        or "<p>Đang cập nhật thông tin chi tiết sản phẩm.</p>",
    }


def sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"

    text = str(value)
    text = text.replace("\\", "\\\\")
    text = text.replace("'", "''")
    text = text.replace("\x00", "")
    return f"'{text}'"


def sql_number(value: Any) -> str:
    if value is None:
        return "NULL"
    return str(value)


def emit_insert(lines: list[str], table: str, columns: list[str], rows: Iterable[list[str]], chunk_size: int = 250) -> None:
    chunk: list[list[str]] = []
    for row in rows:
        chunk.append(row)
        if len(chunk) >= chunk_size:
            emit_insert_chunk(lines, table, columns, chunk)
            chunk = []

    if chunk:
        emit_insert_chunk(lines, table, columns, chunk)


def emit_insert_chunk(lines: list[str], table: str, columns: list[str], rows: list[list[str]]) -> None:
    lines.append(f"INSERT INTO {table} ({', '.join(columns)}) VALUES")
    values_sql = [f"  ({', '.join(row)})" for row in rows]
    lines.append(",\n".join(values_sql) + ";")
    lines.append("")


def load_catalog_schema_statements() -> list[str]:
    content = SCHEMA_FILE.read_text(encoding="utf-8")
    statements = []

    for statement in content.split(";"):
        normalized = statement.strip()
        if not normalized:
            continue

        if "CREATE TABLE IF NOT EXISTS catalog_" not in normalized:
            continue

        statements.append(normalized + ";")

    return statements


def build_seed_sql(
    categories: list[dict[str, Any]],
    companies: list[dict[str, Any]],
    price_rules: list[dict[str, Any]],
    products: list[dict[str, Any]],
    suggestions_by_slug: dict[str, list[str]],
) -> str:
    product_ids_by_slug = {product["slug"]: product["id"] for product in products if product.get("slug")}
    lines = [
        "-- Auto-generated by scripts/sync_real_catalog.py",
        f"-- Generated at: {datetime.now(timezone.utc).isoformat()}",
        "SET NAMES utf8mb4;",
        "",
    ]

    lines.extend(load_catalog_schema_statements())
    lines.extend([
        "",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "DELETE FROM catalog_product_suggestions;",
        "DELETE FROM catalog_product_images;",
        "DELETE FROM catalog_products;",
        "DELETE FROM catalog_companies;",
        "DELETE FROM catalog_price_rules;",
        "DELETE FROM catalog_categories;",
        "SET FOREIGN_KEY_CHECKS = 1;",
        "",
    ])

    emit_insert(
        lines,
        "catalog_categories",
        ["id", "slug", "name", "fallback_image", "sort_order"],
        (
            [
                sql_number(category["id"]),
                sql_literal(category["slug"]),
                sql_literal(category["name"]),
                sql_literal(category["fallbackImage"]),
                sql_number(category["sortOrder"]),
            ]
            for category in categories
        ),
    )

    emit_insert(
        lines,
        "catalog_companies",
        ["id", "category_id", "name", "image_url", "source_image_url"],
        (
            [
                sql_number(company["id"]),
                sql_number(company["categoryIds"][0]),
                sql_literal(company["name"]),
                sql_literal(company["imageUrl"]),
                sql_literal(company["sourceImageUrl"]),
            ]
            for company in companies
        ),
    )

    emit_insert(
        lines,
        "catalog_price_rules",
        ["total", "percent"],
        (
            [
                sql_number(rule["total"]),
                sql_number(f"{rule['percent']:.2f}"),
            ]
            for rule in price_rules
        ),
    )

    emit_insert(
        lines,
        "catalog_products",
        [
            "id",
            "slug",
            "name",
            "price",
            "session_price",
            "category_id",
            "company_id",
            "thumbnail_url",
            "description",
            "detail",
        ],
        (
            [
                sql_literal(product["id"]),
                sql_literal(product["slug"]),
                sql_literal(product["name"]),
                sql_number(product["price"]),
                sql_number(product["sessionPrice"]),
                sql_number(product["categoryId"]),
                sql_number(product["companyId"]),
                sql_literal(product["thumbnailUrl"]),
                sql_literal(product["description"]),
                sql_literal(product["detail"]),
            ]
            for product in products
        ),
        chunk_size=100,
    )

    image_rows = []
    for product in products:
        for index, image_url in enumerate(product["images"], start=1):
            image_rows.append(
                [
                    sql_literal(product["id"]),
                    sql_literal(image_url),
                    sql_number(index),
                ]
            )

    emit_insert(
        lines,
        "catalog_product_images",
        ["product_id", "image_url", "sort_order"],
        image_rows,
        chunk_size=500,
    )

    suggestion_rows = []
    for slug, suggestion_slugs in suggestions_by_slug.items():
        product_id = product_ids_by_slug.get(slug)
        if not product_id:
            continue

        for index, suggestion_slug in enumerate(suggestion_slugs, start=1):
            suggested_id = product_ids_by_slug.get(suggestion_slug)
            if not suggested_id or suggested_id == product_id:
                continue
            suggestion_rows.append(
                [
                    sql_literal(product_id),
                    sql_literal(suggested_id),
                    sql_number(index),
                ]
            )

    emit_insert(
        lines,
        "catalog_product_suggestions",
        ["product_id", "suggested_product_id", "sort_order"],
        suggestion_rows,
        chunk_size=500,
    )

    return "\n".join(lines).rstrip() + "\n"


def main() -> int:
    print("Đang đồng bộ dữ liệu thực tế từ api.dathanhcamera.com ...")

    ensure_directory(PROJECT_DATA_DIR)
    ensure_directory(RAW_DIR)
    ensure_directory(ASSET_DIR)
    ensure_directory(SEED_SQL_FILE.parent)

    categories = build_categories()
    category_lookup = {int(category["id"]): category for category in categories}

    raw_companies = fetch_supported_companies()
    companies = build_companies(raw_companies)
    company_lookup = {int(company["id"]): company for company in companies}

    raw_price_rules = fetch_price_rules()
    price_rules = build_price_rules(raw_price_rules)

    raw_products_by_slug: dict[str, dict[str, Any]] = {}
    for category in categories:
        raw_products = fetch_category_products(int(category["id"]))
        for item in raw_products:
            slug = str(item.get("slug") or "").strip()
            if slug:
                raw_products_by_slug[slug] = item

    detail_products: list[dict[str, Any]] = []
    suggestions_by_slug: dict[str, list[str]] = {}

    sorted_slugs = sorted(raw_products_by_slug.keys())
    for index, slug in enumerate(sorted_slugs, start=1):
        print(f"[{index}/{len(sorted_slugs)}] Đồng bộ chi tiết sản phẩm: {slug}")
        detail = fetch_product_detail(slug)
        if not detail:
            detail = raw_products_by_slug[slug]
        detail_products.append(detail)

        suggestions = fetch_suggestions(detail.get("id"), slug)
        suggestions_by_slug[slug] = [str(item.get("slug")) for item in suggestions if item.get("slug")]

    products = [
        normalize_product(product, category_lookup, company_lookup) for product in detail_products
    ]
    products_by_slug = {product["slug"]: product for product in products if product.get("slug")}

    filtered_suggestions = {}
    for slug, suggestions in suggestions_by_slug.items():
        filtered = [item_slug for item_slug in suggestions if item_slug in products_by_slug and item_slug != slug]
        filtered_suggestions[slug] = filtered[:12]

    catalog_payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceBase": API_BASE,
        "categories": categories,
        "companies": companies,
        "priceRules": price_rules,
        "products": products,
        "suggestionsBySlug": filtered_suggestions,
        "seedSqlFile": str(SEED_SQL_FILE.relative_to(ROOT_DIR)).replace("\\", "/"),
    }

    seed_sql = build_seed_sql(categories, companies, price_rules, products, filtered_suggestions)
    write_json(PROJECT_DATA_DIR / "catalog.json", catalog_payload)
    SEED_SQL_FILE.write_text(seed_sql, encoding="utf-8")

    print(f"Đã ghi file dữ liệu: {PROJECT_DATA_DIR / 'catalog.json'}")
    print(f"Đã ghi file SQL seed: {SEED_SQL_FILE}")
    print(f"Tổng số sản phẩm đã đồng bộ: {len(products)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
