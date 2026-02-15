-- Stylora Database Fix: Create/Update paymentSettings table
-- This script ensures the table exists with the correct security-focused schema

CREATE TABLE IF NOT EXISTS `paymentSettings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tenantId` VARCHAR(36) NOT NULL UNIQUE,
  
  -- Payment Method Toggles
  `vippsEnabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `cardEnabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `cashEnabled` BOOLEAN NOT NULL DEFAULT TRUE,
  `payAtSalonEnabled` BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Stripe Connect (Secure Implementation - No Secret Keys)
  `stripeConnectedAccountId` VARCHAR(255),
  `stripeAccountStatus` ENUM('connected', 'disconnected', 'pending') DEFAULT 'disconnected',
  `stripeConnectedAt` TIMESTAMP NULL,
  
  -- Vipps Configuration (Per-tenant)
  `vippsClientId` TEXT,
  `vippsClientSecret` TEXT,
  `vippsSubscriptionKey` TEXT,
  `vippsMerchantSerialNumber` VARCHAR(20),
  `vippsTestMode` BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Defaults
  `defaultPaymentMethod` ENUM('vipps', 'card', 'cash', 'pay_at_salon') DEFAULT 'pay_at_salon',
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure the platform-admin-tenant has a record to prevent 500 errors
INSERT INTO `paymentSettings` (
  `tenantId`,
  `vippsEnabled`,
  `cardEnabled`,
  `cashEnabled`,
  `payAtSalonEnabled`,
  `defaultPaymentMethod`
) VALUES (
  'platform-admin-tenant',
  FALSE,
  FALSE,
  TRUE,
  TRUE,
  'pay_at_salon'
) ON DUPLICATE KEY UPDATE `updatedAt` = CURRENT_TIMESTAMP;
