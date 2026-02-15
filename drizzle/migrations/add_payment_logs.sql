-- Migration: Add payment_logs table for monitoring and debugging
-- Date: 2026-01-11
-- Description: Creates a table to store payment operation logs for monitoring and debugging

CREATE TABLE IF NOT EXISTS payment_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  level ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info',
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSON,
  payment_id INT,
  order_id INT,
  appointment_id INT,
  user_id INT,
  stripe_payment_intent_id VARCHAR(255),
  error_code VARCHAR(100),
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_level (level),
  INDEX idx_category (category),
  INDEX idx_payment_id (payment_id),
  INDEX idx_created_at (created_at),
  INDEX idx_tenant_level_created (tenant_id, level, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment to table
ALTER TABLE payment_logs COMMENT = 'Stores payment operation logs for monitoring, debugging, and alerting';
