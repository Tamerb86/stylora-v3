-- Align paymentProviders.providerType enum with the application code, which has
-- always referenced "izettle" as a provider type. Idempotent: re-running it is
-- safe because it simply re-declares the full enum set.
ALTER TABLE `paymentProviders`
  MODIFY COLUMN `providerType` ENUM(
    'stripe_terminal',
    'izettle',
    'vipps',
    'nets',
    'manual_card',
    'cash',
    'generic'
  ) NOT NULL;
