# FOCUS CAMERA Storefront

Tài liệu sử dụng chi tiết nằm tại [docs/HUONG_DAN_SU_DUNG.md](./docs/HUONG_DAN_SU_DUNG.md).

Project hiện gồm:

- `public/`: toàn bộ giao diện frontend tĩnh
- `src/`: backend Node.js và các service
- `scripts/`: script đồng bộ dữ liệu thật
- `project-data/`: dữ liệu thực tế đã đồng bộ từ API
- `database/`: file schema MySQL
- `docs/`: tài liệu và ảnh tham chiếu

Luồng mới cho catalog:

1. Chạy `python scripts/sync_real_catalog.py`
2. Import `database/seeds/catalog_seed.sql` vào MySQL
3. Chạy backend để API đọc catalog trực tiếp từ database

Nếu `AUTO_SEED_CATALOG=true`, backend sẽ tự import seed khi schema đã có nhưng catalog còn trống.
