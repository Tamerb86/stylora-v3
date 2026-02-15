/**
 * Utility functions for detecting tenant subdomains in a multi-tenant SaaS application
 */

/**
 * Validate tenant ID format
 * Tenant IDs should be alphanumeric with optional hyphens/underscores
 * Max length 50 characters
 */
function isValidTenantId(tenantId: string): boolean {
  if (!tenantId || tenantId.length === 0 || tenantId.length > 50) {
    return false;
  }
  // Allow alphanumeric characters, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(tenantId);
}

/**
 * Extract tenant slug from hostname
 * Returns null if:
 * - No subdomain exists (e.g., stylora.no)
 * - Subdomain is 'www' (main site)
 * - Running in localhost/development without tenantId param
 * 
 * @returns tenant slug or null
 */
export function getTenantFromHostname(): string | null {
  const hostname = window.location.hostname;
  
  // Check for URL parameter override (useful for development/testing)
  const urlParams = new URLSearchParams(window.location.search);
  const tenantIdParam = urlParams.get("tenantId");
  
  if (tenantIdParam) {
    // Validate tenant ID from query parameter
    if (!isValidTenantId(tenantIdParam)) {
      console.warn("[TenantDetection] Invalid tenantId format:", tenantIdParam);
      return null;
    }
    console.log("[TenantDetection] Using tenantId from URL parameter:", tenantIdParam);
    return tenantIdParam;
  }
  
  // Development environment (localhost or railway preview)
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    console.log("[TenantDetection] Localhost detected - no tenant");
    return null;
  }
  
  // Railway preview URLs
  if (hostname.includes("railway.app")) {
    console.log("[TenantDetection] Railway environment detected - no tenant");
    return null;
  }
  
  // Split hostname into parts
  const parts = hostname.split(".");
  
  // Handle stylora.no (2 parts) - no subdomain
  if (parts.length === 2) {
    console.log("[TenantDetection] Root domain - no tenant");
    return null;
  }
  
  // Handle subdomain.stylora.no (3+ parts)
  if (parts.length >= 3) {
    const subdomain = parts[0];
    
    // Exclude 'www' subdomain (main marketing site)
    if (subdomain === "www") {
      console.log("[TenantDetection] WWW subdomain - no tenant");
      return null;
    }
    
    // Validate subdomain format
    if (!isValidTenantId(subdomain)) {
      console.warn("[TenantDetection] Invalid subdomain format:", subdomain);
      return null;
    }
    
    console.log("[TenantDetection] Tenant subdomain detected:", subdomain);
    return subdomain;
  }
  
  console.log("[TenantDetection] Could not determine tenant");
  return null;
}

/**
 * Check if current URL is a tenant subdomain
 */
export function isTenantSubdomain(): boolean {
  return getTenantFromHostname() !== null;
}
