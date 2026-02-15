-- Fix paymentProviders table to make OAuth fields optional
-- This allows Stripe Terminal and other non-OAuth providers to work

-- Make OAuth fields nullable
ALTER TABLE `paymentProviders` 
  MODIFY COLUMN `accessToken` TEXT NULL,
  MODIFY COLUMN `refreshToken` TEXT NULL,
  MODIFY COLUMN `tokenExpiresAt` DATETIME(3) NULL;

-- Update providerType enum to remove izettle and ensure stripe_terminal exists
-- Note: MySQL doesn't allow direct enum modification, so we need to recreate
-- This is safe because we're only removing 'izettle' which is no longer used

-- If there are any izettle records, convert them to generic first
UPDATE `paymentProviders` SET `providerType` = 'generic' WHERE `providerType` = 'izettle';
