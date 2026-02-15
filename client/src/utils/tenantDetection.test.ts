import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getTenantFromHostname, isTenantSubdomain } from "./tenantDetection";

describe("tenantDetection", () => {
  const originalLocation = window.location;
  
  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = { ...originalLocation } as any;
  });

  afterEach(() => {
    // Restore original location
    window.location = originalLocation;
  });

  describe("getTenantFromHostname", () => {
    it("should detect tenant from subdomain", () => {
      (window.location as any) = {
        hostname: "tamerbn.stylora.no",
        search: "",
      };
      expect(getTenantFromHostname()).toBe("tamerbn");
    });

    it("should detect tenant from multi-level subdomain", () => {
      (window.location as any) = {
        hostname: "salon123.stylora.no",
        search: "",
      };
      expect(getTenantFromHostname()).toBe("salon123");
    });

    it("should return null for www subdomain", () => {
      (window.location as any) = {
        hostname: "www.stylora.no",
        search: "",
      };
      expect(getTenantFromHostname()).toBeNull();
    });

    it("should return null for root domain", () => {
      (window.location as any) = {
        hostname: "stylora.no",
        search: "",
      };
      expect(getTenantFromHostname()).toBeNull();
    });

    it("should return null for localhost", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "",
      };
      expect(getTenantFromHostname()).toBeNull();
    });

    it("should return null for 127.0.0.1", () => {
      (window.location as any) = {
        hostname: "127.0.0.1",
        search: "",
      };
      expect(getTenantFromHostname()).toBeNull();
    });

    it("should return null for railway.app domains", () => {
      (window.location as any) = {
        hostname: "stylora-production.railway.app",
        search: "",
      };
      expect(getTenantFromHostname()).toBeNull();
    });

    it("should use tenantId from query parameter if present", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "?tenantId=testTenant",
      };
      expect(getTenantFromHostname()).toBe("testTenant");
    });

    it("should prioritize query parameter over subdomain", () => {
      (window.location as any) = {
        hostname: "salon1.stylora.no",
        search: "?tenantId=overrideTenant",
      };
      expect(getTenantFromHostname()).toBe("overrideTenant");
    });

    it("should handle complex subdomains", () => {
      (window.location as any) = {
        hostname: "my-salon-123.stylora.no",
        search: "",
      };
      expect(getTenantFromHostname()).toBe("my-salon-123");
    });

    it("should reject invalid tenantId with special characters", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "?tenantId=test@salon.com",
      };
      expect(getTenantFromHostname()).toBeNull();
    });

    it("should reject invalid tenantId with spaces", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "?tenantId=test salon",
      };
      expect(getTenantFromHostname()).toBeNull();
    });

    it("should reject tenantId that is too long", () => {
      const longTenantId = "a".repeat(51); // 51 characters
      (window.location as any) = {
        hostname: "localhost",
        search: `?tenantId=${longTenantId}`,
      };
      expect(getTenantFromHostname()).toBeNull();
    });

    it("should accept valid tenantId with hyphens", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "?tenantId=my-salon-123",
      };
      expect(getTenantFromHostname()).toBe("my-salon-123");
    });

    it("should accept valid tenantId with underscores", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "?tenantId=my_salon_123",
      };
      expect(getTenantFromHostname()).toBe("my_salon_123");
    });

    it("should reject empty tenantId", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "?tenantId=",
      };
      expect(getTenantFromHostname()).toBeNull();
    });
  });

  describe("isTenantSubdomain", () => {
    it("should return true for tenant subdomain", () => {
      (window.location as any) = {
        hostname: "tamerbn.stylora.no",
        search: "",
      };
      expect(isTenantSubdomain()).toBe(true);
    });

    it("should return false for www subdomain", () => {
      (window.location as any) = {
        hostname: "www.stylora.no",
        search: "",
      };
      expect(isTenantSubdomain()).toBe(false);
    });

    it("should return false for root domain", () => {
      (window.location as any) = {
        hostname: "stylora.no",
        search: "",
      };
      expect(isTenantSubdomain()).toBe(false);
    });

    it("should return false for localhost", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "",
      };
      expect(isTenantSubdomain()).toBe(false);
    });

    it("should return true when valid tenantId query param is present", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "?tenantId=test",
      };
      expect(isTenantSubdomain()).toBe(true);
    });

    it("should return false when invalid tenantId query param is present", () => {
      (window.location as any) = {
        hostname: "localhost",
        search: "?tenantId=test@invalid",
      };
      expect(isTenantSubdomain()).toBe(false);
    });
  });
});
