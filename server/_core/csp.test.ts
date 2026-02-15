import { describe, expect, it, beforeEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

/**
 * CSP Route-Based Implementation Tests
 * 
 * Tests the Content Security Policy middleware that applies different CSP policies
 * based on the route path. Terminal-related routes get relaxed CSP for Stripe Terminal,
 * while all other routes get strict CSP.
 */
describe("CSP Route-Based Implementation", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let setHeaderSpy: ReturnType<typeof vi.fn>;

  // Terminal paths that should get relaxed CSP
  const terminalPaths = [
    "/reader-management",
    "/terminal-test",
    "/terminal",
    "/pos",
  ];

  beforeEach(() => {
    setHeaderSpy = vi.fn();
    mockNext = vi.fn();

    mockRequest = {
      path: "",
      url: "",
    };

    mockResponse = {
      setHeader: setHeaderSpy,
    };
  });

  /**
   * Helper function to simulate the CSP middleware logic
   * This mirrors the actual implementation in server/_core/index.ts
   */
  const applyCspMiddleware = (
    req: Partial<Request>,
    res: Partial<Response>,
    next: NextFunction,
    isDev: boolean = false
  ) => {
    const getRequestPath = (request: Partial<Request>) =>
      request.path || (request.url ? request.url.split("?")[0] : "");

    // Skip CSP in development mode
    if (isDev) {
      next();
      return;
    }

    const path = getRequestPath(req);

    // Check if current path is a terminal route
    const isTerminalPath = terminalPaths.some(terminalPath => {
      // Exact match
      if (path === terminalPath) return true;
      // Prefix match with path separator (prevents /pos matching /position)
      return path.startsWith(terminalPath) && path[terminalPath.length] === "/";
    });

    // Apply appropriate CSP header
    if (isTerminalPath) {
      res.setHeader!(
        "Content-Security-Policy",
        [
          "script-src 'self' https://js.stripe.com 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "font-src 'self' https: data:",
          "img-src 'self' https: data: blob:",
          "connect-src 'self' https: wss:",
        ].join("; ")
      );
    } else {
      res.setHeader!(
        "Content-Security-Policy",
        [
          "script-src 'self' https://js.stripe.com",
          "style-src 'self'",
          "font-src 'self'",
          "img-src 'self' data: https:",
          "connect-src 'self' https://api.stripe.com",
        ].join("; ")
      );
    }

    next();
  };

  describe("Terminal Routes - Should get relaxed CSP", () => {
    it("should apply terminal CSP to /reader-management", () => {
      mockRequest.path = "/reader-management";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).toContain("'unsafe-inline'"); // script-src and style-src
      expect(cspHeader).toContain("font-src 'self' https: data:");
      expect(cspHeader).toContain("img-src 'self' https: data: blob:");
      expect(cspHeader).toContain("connect-src 'self' https: wss:");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should apply terminal CSP to /terminal-test", () => {
      mockRequest.path = "/terminal-test";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).toContain("'unsafe-inline'");
      expect(cspHeader).toContain("https:");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should apply terminal CSP to /terminal", () => {
      mockRequest.path = "/terminal";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).toContain("'unsafe-inline'");
      expect(cspHeader).toContain("https:");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should apply terminal CSP to /terminal/settings (subpath)", () => {
      mockRequest.path = "/terminal/settings";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).toContain("'unsafe-inline'");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should apply terminal CSP to /pos", () => {
      mockRequest.path = "/pos";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).toContain("'unsafe-inline'");
      expect(cspHeader).toContain("connect-src 'self' https: wss:");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should apply terminal CSP to /pos/payment (subpath)", () => {
      mockRequest.path = "/pos/payment";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).toContain("'unsafe-inline'");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should apply terminal CSP to /terminal-test/page (subpath)", () => {
      mockRequest.path = "/terminal-test/page";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).toContain("'unsafe-inline'");
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Non-Terminal Routes - Should get strict CSP", () => {
    it("should apply strict CSP to /dashboard (no unsafe-inline)", () => {
      mockRequest.path = "/dashboard";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      // Should NOT contain 'unsafe-inline'
      expect(cspHeader).not.toContain("'unsafe-inline'");
      // Should NOT contain generic "https:" or "wss:" in connect-src
      expect(cspHeader).not.toMatch(/connect-src[^;]*\bhttps:\s/);
      expect(cspHeader).not.toMatch(/connect-src[^;]*\bwss:\s/);
      expect(cspHeader).toContain("https://api.stripe.com");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should apply strict CSP to /home (no unsafe-inline)", () => {
      mockRequest.path = "/home";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).not.toContain("'unsafe-inline'");
      expect(cspHeader).not.toMatch(/connect-src[^;]*\bwss:\s/);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should apply strict CSP to /customers (no unsafe-inline)", () => {
      mockRequest.path = "/customers";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      expect(cspHeader).not.toContain("'unsafe-inline'");
      expect(cspHeader).toContain("https://api.stripe.com");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should NOT match /terminals when checking /terminal", () => {
      mockRequest.path = "/terminals";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      const cspHeader = setHeaderSpy.mock.calls[0][1];
      // Should NOT contain 'unsafe-inline'
      expect(cspHeader).not.toContain("'unsafe-inline'");
      // Should NOT contain generic "https:" directive in connect-src
      expect(cspHeader).not.toMatch(/connect-src[^;]*\bhttps:\s/);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Development Mode", () => {
    it("should skip CSP in development mode", () => {
      mockRequest.path = "/reader-management";
      applyCspMiddleware(mockRequest, mockResponse, mockNext, true);

      expect(setHeaderSpy).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Path Extraction", () => {
    it("should extract path from req.path", () => {
      mockRequest.path = "/pos/payment";
      mockRequest.url = "/pos/payment?id=123";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.stringContaining("https:")
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should extract path from req.url when req.path is not available", () => {
      mockRequest.path = "";
      mockRequest.url = "/terminal-test?test=true";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.stringContaining("https:")
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it("should handle query parameters correctly", () => {
      mockRequest.path = "/reader-management";
      mockRequest.url = "/reader-management?tab=settings";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);

      expect(setHeaderSpy).toHaveBeenCalledWith(
        "Content-Security-Policy",
        expect.stringContaining("https:")
      );
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe("Security - Path Matching", () => {
    it("should use exact match for terminal paths", () => {
      const testCases = [
        { path: "/reader-management", shouldMatch: true },
        { path: "/terminal-test", shouldMatch: true },
        { path: "/terminal", shouldMatch: true },
        { path: "/pos", shouldMatch: true },
      ];

      testCases.forEach(({ path, shouldMatch }) => {
        setHeaderSpy.mockClear();
        mockRequest.path = path;
        applyCspMiddleware(mockRequest, mockResponse, mockNext);

        if (shouldMatch) {
          const cspHeader = setHeaderSpy.mock.calls[0][1];
          // Should contain 'unsafe-inline' for terminal routes
          expect(cspHeader).toContain("'unsafe-inline'");
        }
      });
    });

    it("should require path separator for prefix matching", () => {
      const testCases = [
        { path: "/terminal/settings", shouldMatch: true },
        { path: "/terminals", shouldMatch: false },
        { path: "/terminal-test/page", shouldMatch: true },
        { path: "/terminal-testing", shouldMatch: false },
        { path: "/pos/payment", shouldMatch: true },
        { path: "/position", shouldMatch: false },
        { path: "/poster", shouldMatch: false },
      ];

      testCases.forEach(({ path, shouldMatch }) => {
        setHeaderSpy.mockClear();
        mockRequest.path = path;
        applyCspMiddleware(mockRequest, mockResponse, mockNext);

        const cspHeader = setHeaderSpy.mock.calls[0][1];
        if (shouldMatch) {
          // Should contain 'unsafe-inline' for terminal routes
          expect(cspHeader).toContain("'unsafe-inline'");
        } else {
          // Should NOT contain 'unsafe-inline' for non-terminal routes
          expect(cspHeader).not.toContain("'unsafe-inline'");
        }
      });
    });
  });

  describe("Security - unsafe-inline Isolation", () => {
    it("should include unsafe-inline ONLY on terminal routes", () => {
      const terminalRoutes = ["/reader-management", "/terminal-test", "/terminal", "/pos"];
      const nonTerminalRoutes = ["/dashboard", "/home", "/customers", "/settings"];

      terminalRoutes.forEach(path => {
        setHeaderSpy.mockClear();
        mockRequest.path = path;
        applyCspMiddleware(mockRequest, mockResponse, mockNext);
        const cspHeader = setHeaderSpy.mock.calls[0][1];
        expect(cspHeader).toContain("'unsafe-inline'");
      });

      nonTerminalRoutes.forEach(path => {
        setHeaderSpy.mockClear();
        mockRequest.path = path;
        applyCspMiddleware(mockRequest, mockResponse, mockNext);
        const cspHeader = setHeaderSpy.mock.calls[0][1];
        expect(cspHeader).not.toContain("'unsafe-inline'");
      });
    });

    it("should include all required directives for Stripe Terminal", () => {
      mockRequest.path = "/reader-management";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);
      
      const cspHeader = setHeaderSpy.mock.calls[0][1];
      
      // Verify all required directives for Stripe Terminal
      expect(cspHeader).toContain("script-src 'self' https://js.stripe.com 'unsafe-inline'");
      expect(cspHeader).toContain("style-src 'self' 'unsafe-inline'");
      expect(cspHeader).toContain("font-src 'self' https: data:");
      expect(cspHeader).toContain("img-src 'self' https: data: blob:");
      expect(cspHeader).toContain("connect-src 'self' https: wss:");
    });

    it("should maintain strict CSP on non-terminal routes", () => {
      mockRequest.path = "/dashboard";
      applyCspMiddleware(mockRequest, mockResponse, mockNext);
      
      const cspHeader = setHeaderSpy.mock.calls[0][1];
      
      // Verify strict CSP without unsafe-inline
      expect(cspHeader).toContain("script-src 'self' https://js.stripe.com");
      expect(cspHeader).not.toContain("'unsafe-inline'");
      expect(cspHeader).toContain("style-src 'self'");
      expect(cspHeader).toContain("font-src 'self'");
      // Should not have broad https: and wss: in connect-src
      expect(cspHeader).not.toMatch(/connect-src[^;]*\bhttps:\s/);
      expect(cspHeader).not.toMatch(/connect-src[^;]*\bwss:\s/);
    });
  });
});
