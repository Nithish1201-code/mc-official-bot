import { describe, it, expect } from "vitest";
import {
  ValidationError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
  getStatusCode,
  isAppError,
} from "../errors.js";

describe("Error Handling", () => {
  describe("ValidationError", () => {
    it("should create validation error", () => {
      const error = new ValidationError("Invalid input", "email");
      expect(error.message).toBe("Invalid input");
      expect(error.field).toBe("email");
      expect(error.name).toBe("ValidationError");
    });

    it("should map to 400 status code", () => {
      const error = new ValidationError("Invalid");
      expect(getStatusCode(error)).toBe(400);
    });
  });

  describe("AuthenticationError", () => {
    it("should create auth error with default message", () => {
      const error = new AuthenticationError();
      expect(error.message).toBe("Authentication failed");
      expect(error.name).toBe("AuthenticationError");
    });

    it("should map to 401 status code", () => {
      const error = new AuthenticationError();
      expect(getStatusCode(error)).toBe(401);
    });
  });

  describe("NotFoundError", () => {
    it("should create not found error", () => {
      const error = new NotFoundError("User");
      expect(error.message).toBe("User not found");
    });

    it("should map to 404 status code", () => {
      const error = new NotFoundError("Resource");
      expect(getStatusCode(error)).toBe(404);
    });
  });

  describe("RateLimitError", () => {
    it("should create rate limit error with retry after", () => {
      const error = new RateLimitError("Too many requests", 60);
      expect(error.message).toBe("Too many requests");
      expect(error.retryAfter).toBe(60);
    });

    it("should map to 429 status code", () => {
      const error = new RateLimitError();
      expect(getStatusCode(error)).toBe(429);
    });
  });

  describe("isAppError", () => {
    it("should identify app errors", () => {
      const error = new ValidationError("Test");
      expect(isAppError(error)).toBe(true);
    });

    it("should reject non-app errors", () => {
      const error = new Error("Generic error");
      expect(isAppError(error)).toBe(false);
    });
  });

  describe("getStatusCode", () => {
    it("should return 500 for unknown errors", () => {
      const error = new Error("Unknown");
      expect(getStatusCode(error)).toBe(500);
    });

    it("should return correct status for each error type", () => {
      expect(getStatusCode(new ValidationError("x"))).toBe(400);
      expect(getStatusCode(new AuthenticationError())).toBe(401);
      expect(getStatusCode(new NotFoundError("x"))).toBe(404);
      expect(getStatusCode(new RateLimitError())).toBe(429);
    });
  });
});
