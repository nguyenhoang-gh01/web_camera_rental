-- Catalog seed for FOCUS CAMERA
-- Rebuilt from public/assets/catalog/product_new/product_data_new.txt
-- Generated locally on 2026-04-01
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS catalog_categories (
  id INT NOT NULL PRIMARY KEY,
  slug VARCHAR(191) NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL,
  fallback_image TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_companies (
  id INT NOT NULL PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(191) NOT NULL,
  image_url TEXT NULL,
  source_image_url TEXT NULL,
  CONSTRAINT fk_catalog_companies_category
    FOREIGN KEY (category_id) REFERENCES catalog_categories(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_price_rules (
  total INT NOT NULL PRIMARY KEY,
  percent DECIMAL(6,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_products (
  id VARCHAR(50) NOT NULL PRIMARY KEY,
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  price INT NOT NULL DEFAULT 0,
  session_price INT NOT NULL DEFAULT 0,
  category_id INT NOT NULL,
  company_id INT NOT NULL,
  thumbnail_url TEXT NULL,
  description MEDIUMTEXT NULL,
  detail MEDIUMTEXT NULL,
  CONSTRAINT fk_catalog_products_category
    FOREIGN KEY (category_id) REFERENCES catalog_categories(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_catalog_products_company
    FOREIGN KEY (company_id) REFERENCES catalog_companies(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_product_images (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id VARCHAR(50) NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_catalog_product_images_product
    FOREIGN KEY (product_id) REFERENCES catalog_products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_product_suggestions (
  product_id VARCHAR(50) NOT NULL,
  suggested_product_id VARCHAR(50) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, suggested_product_id),
  CONSTRAINT fk_catalog_product_suggestions_product
    FOREIGN KEY (product_id) REFERENCES catalog_products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_catalog_product_suggestions_target
    FOREIGN KEY (suggested_product_id) REFERENCES catalog_products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM catalog_product_suggestions;
DELETE FROM catalog_product_images;
DELETE FROM catalog_products;
DELETE FROM catalog_companies;
DELETE FROM catalog_price_rules;
DELETE FROM catalog_categories;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO catalog_categories (id, slug, name, fallback_image, sort_order) VALUES
  (1, 'thue-camera-may-anh', 'Thuê Camera (Máy ảnh)', '/assets/catalog/product_new/may-anh-fuji-xt20.jpg', 1),
  (5, 'thue-lens-ong-kinh', 'Thuê Lens (Ống kính)', NULL, 2),
  (6, 'thue-phu-kien', 'Thuê Phụ kiện', '/assets/catalog/product_new/gimbal-dji-rs-3.jpg', 3);

INSERT INTO catalog_companies (id, category_id, name, image_url, source_image_url) VALUES
  (1, 1, 'FUJIFILM', NULL, NULL),
  (2, 1, 'CANON', NULL, NULL),
  (3, 1, 'SONY', NULL, NULL),
  (4, 1, 'DJI', NULL, NULL),
  (5, 6, 'BENRO', NULL, NULL),
  (6, 6, 'DJI', NULL, NULL),
  (7, 6, 'STUDIO', NULL, NULL);

INSERT INTO catalog_price_rules (total, percent) VALUES
  (1, 100.00),
  (2, 91.50),
  (3, 86.50),
  (4, 82.30),
  (5, 79.80),
  (6, 78.60),
  (7, 75.70);

INSERT INTO catalog_products (id, slug, name, price, session_price, category_id, company_id, thumbnail_url, description, detail) VALUES
  ('NEW001', 'thue-may-anh-fuji-xt20', 'Máy ảnh Fuji XT20', 250000, 140000, 1, 1, '/assets/catalog/product_new/may-anh-fuji-xt20.jpg', '<ul><li>Máy ảnh mirrorless gọn nhẹ, dễ làm quen.</li><li>Phù hợp chụp du lịch, chân dung và nội dung hằng ngày.</li><li>Cho thuê theo buổi hoặc theo ngày tại Focus Camera.</li></ul>', '<p>Fuji XT20 là lựa chọn phù hợp cho người cần một chiếc máy ảnh nhỏ gọn nhưng vẫn cho chất lượng hình ảnh tốt. Sản phẩm phù hợp để chụp du lịch, chân dung, sự kiện nhỏ và sáng tạo nội dung cá nhân.</p><p>Focus Camera chuẩn bị thiết bị sạch sẽ, dễ nhận máy và hỗ trợ tư vấn nhanh nếu bạn cần chọn thêm pin, thẻ nhớ hoặc phụ kiện đi kèm.</p>'),
  ('NEW002', 'thue-may-anh-fuji-xa5', 'Máy ảnh Fuji XA5', 170000, 95000, 1, 1, '/assets/catalog/product_new/may-anh-fuji-xa5.jpg', '<ul><li>Thiết kế nhỏ gọn, dễ mang theo.</li><li>Phù hợp chụp ảnh đời thường, du lịch và cá nhân.</li><li>Mức giá thuê tiết kiệm, dễ tiếp cận.</li></ul>', '<p>Fuji XA5 là mẫu máy ảnh phù hợp với người dùng thích sự gọn nhẹ và thao tác đơn giản. Thiết bị thích hợp cho các buổi chụp cá nhân, du lịch hoặc quay chụp nội dung cơ bản.</p><p>Nếu bạn cần một bộ máy dễ sử dụng và tối ưu chi phí, đây là lựa chọn rất phù hợp trong danh mục thuê của cửa hàng.</p>'),
  ('NEW003', 'thue-may-anh-fuji-xa2', 'Máy ảnh Fuji XA2', 150000, 85000, 1, 1, '/assets/catalog/product_new/may-anh-fuji-xa2.jpg', '<ul><li>Máy ảnh nhỏ gọn, dễ thao tác.</li><li>Phù hợp chụp chân dung, du lịch và sử dụng cá nhân.</li><li>Thuê linh hoạt theo buổi hoặc theo ngày.</li></ul>', '<p>Fuji XA2 đáp ứng tốt nhu cầu chụp ảnh cơ bản với ngoại hình gọn và thao tác thân thiện. Đây là mẫu máy phù hợp cho người mới bắt đầu hoặc người cần một thiết bị nhẹ để mang đi thường xuyên.</p><p>Thiết bị được kiểm tra trước khi giao để bạn có thể sử dụng nhanh trong các lịch chụp ngắn hoặc chuyến đi cuối tuần.</p>'),
  ('NEW004', 'thue-may-anh-canon-m10', 'Máy ảnh Canon M10', 120000, 70000, 1, 2, '/assets/catalog/product_new/may-anh-canon-m10.jpg', '<ul><li>Máy ảnh nhỏ gọn, dễ dùng cho người mới.</li><li>Phù hợp chụp ảnh cá nhân và du lịch.</li><li>Chi phí thuê tiết kiệm, phù hợp nhu cầu ngắn hạn.</li></ul>', '<p>Canon M10 là mẫu máy ảnh đơn giản, dễ tiếp cận và phù hợp với người dùng cần một thiết bị chụp ảnh nhanh gọn. Máy phù hợp cho chụp cá nhân, đi chơi, sự kiện nhỏ hoặc tạo nội dung cơ bản.</p><p>Đây là lựa chọn phù hợp nếu bạn muốn bắt đầu với một chiếc máy ảnh nhỏ gọn và không cần thiết lập quá phức tạp.</p>'),
  ('NEW005', 'thue-may-anh-canon-m3', 'Máy ảnh Canon M3', 160000, 100000, 1, 2, '/assets/catalog/product_new/may-anh-canon-m3.jpg', '<ul><li>Thân máy nhỏ gọn, dễ sử dụng.</li><li>Phù hợp chụp du lịch, chân dung và đời thường.</li><li>Giá thuê cân đối cho nhu cầu cá nhân.</li></ul>', '<p>Canon M3 là mẫu máy ảnh phù hợp cho nhu cầu chụp ảnh cá nhân, du lịch và các lịch chụp gọn nhẹ. Thiết bị mang lại trải nghiệm sử dụng thân thiện, dễ làm quen và dễ mang theo cả ngày.</p><p>Khi thuê tại Focus Camera, bạn có thể kết hợp thêm phụ kiện cơ bản để tối ưu trải nghiệm cho từng mục đích sử dụng.</p>'),
  ('NEW006', 'thue-may-anh-canon-r50', 'Máy ảnh Canon R50', 250000, 160000, 1, 2, '/assets/catalog/product_new/may-anh-canon-r50.jpg', '<ul><li>Máy ảnh hiện đại, phù hợp chụp và quay nội dung.</li><li>Thiết kế gọn, dễ mang theo khi di chuyển.</li><li>Phù hợp creator, du lịch và công việc cá nhân.</li></ul>', '<p>Canon R50 là lựa chọn phù hợp cho người cần một thân máy hiện đại để chụp ảnh và quay video ngắn. Máy phù hợp với người sáng tạo nội dung, du lịch, vlog hoặc các lịch chụp cá nhân linh hoạt.</p><p>Nếu bạn muốn một thiết bị mới, dễ dùng và cho trải nghiệm ổn định, đây là mẫu máy đáng cân nhắc trong nhóm camera thuê của cửa hàng.</p>'),
  ('NEW007', 'thue-may-anh-sony-a5100', 'Máy ảnh Sony A5100', 170000, 95000, 1, 3, '/assets/catalog/product_new/may-anh-sony-a5100.jpg', '<ul><li>Máy ảnh nhỏ gọn, phù hợp di chuyển nhiều.</li><li>Phù hợp chụp ảnh cá nhân, du lịch và lifestyle.</li><li>Dễ kết hợp cùng các phụ kiện quay chụp cơ bản.</li></ul>', '<p>Sony A5100 là mẫu máy ảnh được nhiều người lựa chọn khi cần một thiết bị nhỏ gọn, linh hoạt và dễ sử dụng. Máy phù hợp cho nhu cầu chụp ảnh cá nhân, du lịch hoặc tạo nội dung hằng ngày.</p><p>Focus Camera hỗ trợ chuẩn bị máy sẵn sàng để bạn có thể nhận và sử dụng nhanh cho các lịch chụp ngắn hạn.</p>'),
  ('NEW008', 'thue-pocket-3', 'Pocket 3', 250000, 160000, 1, 4, '/assets/catalog/product_new/pocket-3.jpg', '<ul><li>Thiết bị quay chụp nhỏ gọn, tiện mang theo.</li><li>Phù hợp vlog, travel content và ghi hình nhanh.</li><li>Tối ưu cho người cần sự cơ động cao.</li></ul>', '<p>Pocket 3 là lựa chọn rất phù hợp cho người cần một thiết bị quay chụp nhỏ gọn, dễ mang theo và thao tác nhanh. Thiết bị phục vụ tốt cho vlog, du lịch, hậu trường hoặc ghi hình hằng ngày.</p><p>Nếu bạn ưu tiên sự linh hoạt, cơ động và thời gian chuẩn bị nhanh, đây là sản phẩm rất đáng để thuê trong các lịch quay ngắn.</p>'),
  ('NEW009', 'thue-powershot-ixy-50s', 'PowerShot IXY 50S', 130000, 70000, 1, 2, '/assets/catalog/product_new/powershot-ixy-50s.jpg', '<ul><li>Máy ảnh nhỏ gọn, tiện mang theo mọi lúc.</li><li>Phù hợp chụp ảnh cá nhân, du lịch và lưu niệm.</li><li>Thao tác đơn giản, dễ dùng cho nhu cầu cơ bản.</li></ul>', '<p>PowerShot IXY 50S phù hợp cho người cần một thiết bị chụp ảnh gọn nhẹ, dễ sử dụng và tiện mang theo. Máy đáp ứng tốt nhu cầu ghi lại khoảnh khắc cá nhân, du lịch hoặc các buổi đi chơi ngắn.</p><p>Đây là lựa chọn phù hợp nếu bạn muốn thuê một thiết bị đơn giản, nhanh gọn và tối ưu chi phí.</p>'),
  ('NEW010', 'thue-chan-may-anh-benro-a350', 'Chân máy ảnh Benro A350', 75000, 50000, 6, 5, '/assets/catalog/product_new/chan-may-anh-benro-a350.jpg', '<ul><li>Phụ kiện hỗ trợ cố định máy chắc chắn.</li><li>Phù hợp chụp ảnh, quay video và set up cơ bản.</li><li>Dễ mang theo cho các buổi làm việc ngắn.</li></ul>', '<p>Benro A350 là chân máy phù hợp cho nhu cầu cố định máy ảnh hoặc máy quay trong các buổi chụp, quay và livestream cơ bản. Phụ kiện này giúp bạn giữ khung hình ổn định và thao tác thuận tiện hơn.</p><p>Sản phẩm phù hợp để kết hợp với các dòng máy ảnh nhỏ gọn hoặc setup quay nội dung cá nhân.</p>'),
  ('NEW011', 'thue-chan-may-anh-carbon-benro-tortoise-ttor24c', 'Chân máy ảnh Carbon Benro Tortoise TTOR24C', 140000, 95000, 6, 5, '/assets/catalog/product_new/chan-may-anh-carbon-benro-tortoise-ttor24c.jpg', '<ul><li>Chân máy carbon gọn nhẹ, dễ di chuyển.</li><li>Phù hợp chụp ngoại cảnh và quay chụp linh hoạt.</li><li>Tối ưu cho người cần thiết bị chắc chắn nhưng cơ động.</li></ul>', '<p>Benro Tortoise TTOR24C là mẫu chân máy phù hợp cho người cần sự ổn định nhưng vẫn giữ được tính cơ động khi di chuyển. Thiết bị thích hợp cho chụp ngoại cảnh, du lịch, video ngắn hoặc setup chuyên nghiệp hơn.</p><p>Đây là lựa chọn phù hợp nếu bạn muốn nâng chất lượng khung hình và thao tác máy trong các buổi quay chụp dài hơn.</p>'),
  ('NEW012', 'thue-gimbal-dji-rs-3', 'Gimbal DJI RS 3', 290000, 200000, 6, 6, '/assets/catalog/product_new/gimbal-dji-rs-3.jpg', '<ul><li>Gimbal hỗ trợ chống rung hiệu quả.</li><li>Phù hợp quay video chuyển động, review và sự kiện.</li><li>Tăng độ mượt cho các cảnh quay cầm tay.</li></ul>', '<p>DJI RS 3 là gimbal phù hợp cho các nhu cầu quay video cần chuyển động mượt và ổn định. Sản phẩm phù hợp với creator, ekip nhỏ, quay review, sự kiện hoặc các cảnh di chuyển liên tục.</p><p>Khi thuê gimbal tại Focus Camera, bạn có thể kết hợp thêm máy ảnh phù hợp để hoàn thiện bộ quay ngay trong một lần nhận thiết bị.</p>'),
  ('NEW013', 'thue-gimbal-dji-ronin-sc', 'Gimbal DJI Ronin-SC', 200000, 140000, 6, 6, '/assets/catalog/product_new/gimbal-dji-ronin-sc.jpg', '<ul><li>Gimbal nhỏ gọn, dễ cân chỉnh.</li><li>Phù hợp quay video cá nhân, travel và social content.</li><li>Hỗ trợ chống rung tốt cho setup gọn nhẹ.</li></ul>', '<p>DJI Ronin-SC là lựa chọn phù hợp cho người cần một gimbal nhỏ gọn để quay nội dung hằng ngày, vlog, travel hoặc video sản phẩm. Thiết bị giúp giữ cảnh quay mượt hơn so với quay cầm tay thông thường.</p><p>Sản phẩm phù hợp với các setup máy ảnh nhẹ và các nhu cầu quay linh hoạt, di chuyển nhiều.</p>'),
  ('NEW014', 'thue-du-phan-va-vai-softbox-130cm-16-canh', 'Dù phản và vải Softbox 130cm 16 cạnh', 100000, 70000, 6, 7, '/assets/catalog/product_new/du-phan-va-vai-softbox-130cm-16-canh.jpg', '<ul><li>Phụ kiện ánh sáng hỗ trợ tản sáng mềm.</li><li>Phù hợp chụp chân dung, sản phẩm và quay studio.</li><li>Dễ kết hợp với các setup quay chụp cơ bản.</li></ul>', '<p>Bộ dù phản và vải softbox 130cm 16 cạnh phù hợp cho các nhu cầu cần ánh sáng mềm, đều và dễ chịu hơn. Thiết bị thích hợp cho chụp chân dung, chụp sản phẩm, livestream hoặc setup studio cơ bản.</p><p>Đây là phụ kiện nên có khi bạn muốn cải thiện chất lượng ánh sáng mà vẫn giữ bộ thiết bị gọn và dễ triển khai.</p>');

INSERT INTO catalog_product_images (product_id, image_url, sort_order) VALUES
  ('NEW001', '/assets/catalog/product_new/may-anh-fuji-xt20.jpg', 1),
  ('NEW002', '/assets/catalog/product_new/may-anh-fuji-xa5.jpg', 1),
  ('NEW003', '/assets/catalog/product_new/may-anh-fuji-xa2.jpg', 1),
  ('NEW004', '/assets/catalog/product_new/may-anh-canon-m10.jpg', 1),
  ('NEW005', '/assets/catalog/product_new/may-anh-canon-m3.jpg', 1),
  ('NEW006', '/assets/catalog/product_new/may-anh-canon-r50.jpg', 1),
  ('NEW007', '/assets/catalog/product_new/may-anh-sony-a5100.jpg', 1),
  ('NEW008', '/assets/catalog/product_new/pocket-3.jpg', 1),
  ('NEW009', '/assets/catalog/product_new/powershot-ixy-50s.jpg', 1),
  ('NEW010', '/assets/catalog/product_new/chan-may-anh-benro-a350.jpg', 1),
  ('NEW011', '/assets/catalog/product_new/chan-may-anh-carbon-benro-tortoise-ttor24c.jpg', 1),
  ('NEW012', '/assets/catalog/product_new/gimbal-dji-rs-3.jpg', 1),
  ('NEW013', '/assets/catalog/product_new/gimbal-dji-ronin-sc.jpg', 1),
  ('NEW014', '/assets/catalog/product_new/du-phan-va-vai-softbox-130cm-16-canh.jpg', 1);

INSERT INTO catalog_product_suggestions (product_id, suggested_product_id, sort_order) VALUES
  ('NEW001', 'NEW002', 1),
  ('NEW001', 'NEW006', 2),
  ('NEW002', 'NEW003', 1),
  ('NEW002', 'NEW007', 2),
  ('NEW003', 'NEW004', 1),
  ('NEW003', 'NEW005', 2),
  ('NEW004', 'NEW005', 1),
  ('NEW004', 'NEW009', 2),
  ('NEW005', 'NEW006', 1),
  ('NEW005', 'NEW001', 2),
  ('NEW006', 'NEW007', 1),
  ('NEW006', 'NEW008', 2),
  ('NEW007', 'NEW001', 1),
  ('NEW007', 'NEW008', 2),
  ('NEW008', 'NEW006', 1),
  ('NEW008', 'NEW009', 2),
  ('NEW009', 'NEW004', 1),
  ('NEW009', 'NEW002', 2),
  ('NEW010', 'NEW011', 1),
  ('NEW010', 'NEW012', 2),
  ('NEW011', 'NEW010', 1),
  ('NEW011', 'NEW013', 2),
  ('NEW012', 'NEW013', 1),
  ('NEW012', 'NEW014', 2),
  ('NEW013', 'NEW012', 1),
  ('NEW013', 'NEW010', 2),
  ('NEW014', 'NEW012', 1),
  ('NEW014', 'NEW011', 2);
