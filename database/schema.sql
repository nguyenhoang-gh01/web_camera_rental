CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  full_name VARCHAR(191) NOT NULL,
  phone VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  birthday DATE NULL,
  address VARCHAR(255) NULL,
  identity_number VARCHAR(100) NULL,
  facebook_url VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_profiles_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_documents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  document_type VARCHAR(50) NOT NULL,
  document_label VARCHAR(191) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_path TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_documents_user_type (user_id, document_type),
  CONSTRAINT fk_user_documents_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS carts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  token CHAR(36) NOT NULL UNIQUE,
  user_id CHAR(36) NULL UNIQUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carts_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cart_id CHAR(36) NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  product_slug VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  price INT NOT NULL DEFAULT 0,
  session_price INT NOT NULL DEFAULT 0,
  rental_days DECIMAL(4,1) NOT NULL DEFAULT 1.0,
  rental_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  image_url TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_items_cart
    FOREIGN KEY (cart_id) REFERENCES carts(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rental_orders (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_code VARCHAR(50) NOT NULL UNIQUE,
  user_id CHAR(36) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  subtotal_price INT NOT NULL DEFAULT 0,
  total_price INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_rental_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rental_order_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id VARCHAR(100) NOT NULL,
  product_slug VARCHAR(255) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  image_url TEXT NULL,
  price INT NOT NULL DEFAULT 0,
  session_price INT NOT NULL DEFAULT 0,
  rental_days DECIMAL(4,1) NOT NULL DEFAULT 1.0,
  rental_start DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total_price INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rental_order_items_order
    FOREIGN KEY (order_id) REFERENCES rental_orders(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NOT NULL,
  show_on_home TINYINT(1) NOT NULL DEFAULT 0,
  is_hidden TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_reviews_home (show_on_home, is_hidden, rating, created_at),
  CONSTRAINT fk_customer_reviews_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
