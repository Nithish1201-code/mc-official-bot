# Testing Guide

Comprehensive guide for running and writing tests.

## Automated Test Execution

Tests run automatically during setup:

```bash
bash setup.sh
# Tests run in Step 7 with full output
```

Test results are saved to:
- `/tmp/shared-test.log` - Shared types tests
- `/tmp/backend-test.log` - Backend API tests  
- `/tmp/bot-test.log` - Bot tests

## Manual Test Execution

### All Tests

```bash
# Run all tests in all packages
npm test

# Watch mode (auto-rerun on changes)
npm test -- --watch
```

### Individual Packages

```bash
# Backend only
cd backend && npm test

# Bot only
cd bot && npm test

# Shared types only
cd shared && npm test
```

### Specific Test File

```bash
cd backend
npm test -- api.test.ts

# With coverage
npm test -- --coverage
```

## Test Structure

### Backend Tests (`backend/src/__tests__/api.test.ts`)

**Coverage:**
- ✓ Health endpoints (no auth)
- ✓ Authentication (API key validation)
- ✓ Server status endpoint
- ✓ Modrinth search integration
- ✓ Plugin management endpoints
- ✓ Server control (restart/stop)
- ✓ Error handling

**Example:**
```typescript
describe("Authentication", () => {
  it("should reject requests without API key", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/status",
    });
    expect(response.statusCode).toBe(401);
  });
});
```

### Shared Tests (`shared/src/__tests__/`)

**Files:**
- `types.test.ts` - Schema validation
- `errors.test.ts` - Error handling

**Coverage:**
- ✓ ServerStatus validation
- ✓ Plugin schema validation
- ✓ Modrinth project validation
- ✓ Config validation with defaults
- ✓ Error class creation
- ✓ Status code mapping

**Example:**
```typescript
describe("ServerStatus", () => {
  it("should validate valid server status", () => {
    const status = { online: true, playerCount: 5, ... };
    const result = ServerStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });
});
```

### Bot Tests (`bot/src/__tests__/utils.test.ts`)

**Coverage:**
- ✓ Backend API client
- ✓ Embed utilities
- ✓ Status embed generation
- ✓ Error embed generation

**Example:**
```typescript
describe("Embed Utilities", () => {
  it("should create status embed", () => {
    const embed = createStatusEmbed(mockStatus);
    expect(embed.data.title).toContain("Server Status");
  });
});
```

## Writing Tests

### Test File Naming

```
src/
  utils/
    logger.ts        → logger.test.ts
  routes/
    status.ts        → status.test.ts
```

Place tests in `__tests__/` directory:
```
src/
  __tests__/
    logger.test.ts
    status.test.ts
```

### Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Feature Name", () => {
  beforeAll(async () => {
    // Setup before all tests
  });

  afterAll(async () => {
    // Cleanup after all tests
  });

  describe("Specific Functionality", () => {
    it("should do something", () => {
      const result = myFunction();
      expect(result).toBe(expected);
    });

    it("should handle errors", () => {
      expect(() => myFunction()).toThrow();
    });
  });
});
```

### Testing API Endpoints

```typescript
const response = await server.inject({
  method: "GET",
  url: "/api/endpoint",
  headers: {
    "x-api-key": "test-key",
  },
  payload: { data: "value" },
});

expect(response.statusCode).toBe(200);
const body = JSON.parse(response.body);
expect(body).toHaveProperty("field");
```

### Testing Validation

```typescript
import { MySchema } from "../types.js";

it("should validate correct input", () => {
  const result = MySchema.safeParse(validInput);
  expect(result.success).toBe(true);
});

it("should reject invalid input", () => {
  const result = MySchema.safeParse(invalidInput);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues).toHaveLength(1);
  }
});
```

### Mocking

```typescript
import { vi } from "vitest";

const mockApi = {
  getStatus: vi.fn().mockResolvedValue({ online: true }),
};

it("should call API", async () => {
  await myFunction(mockApi);
  expect(mockApi.getStatus).toHaveBeenCalled();
});
```

## Test Coverage

View coverage report:

```bash
npm test -- --coverage

# Open HTML report
open coverage/index.html
```

Coverage goals:
- **Backend**: 80%+ coverage
- **Shared**: 90%+ coverage (pure functions)
- **Bot**: 70%+ coverage

## Continuous Integration

Tests should pass before:
- Committing code
- Creating pull requests
- Deploying to production

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm test
if [ $? -ne 0 ]; then
  echo "Tests failed. Commit aborted."
  exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Test Output

### Success

```
✓ Backend API Integration Tests (15)
  ✓ Health Endpoints (3)
    ✓ should respond to health check
    ✓ should respond to ping
    ✓ should return metrics
  ✓ Authentication (3)
  ✓ Server Status (1)
  ✓ Modrinth Integration (2)
  ✓ Plugin Management (2)
  ✓ Server Control (2)

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Duration  2.45s
```

### Failure

```
✗ should validate server status
  AssertionError: expected false to be true

✗ should reject invalid API key  
  Expected: 401
  Received: 200
```

## Troubleshooting

### Tests fail during setup.sh

Check logs:
```bash
cat /tmp/backend-test.log
cat /tmp/shared-test.log
cat /tmp/bot-test.log
```

### Port already in use

```bash
# Find process using test port
lsof -i :3000
kill -9 <PID>
```

### Import errors

```bash
# Rebuild shared types
cd shared && npm run build
cd ../backend && npm install
```

### Timeout errors

Increase timeout in test:
```typescript
it("should complete long operation", { timeout: 10000 }, async () => {
  // Test code
});
```

## Best Practices

1. **Descriptive test names**
   ```typescript
   ✓ it("should return 401 when API key is missing")
   ✗ it("test auth")
   ```

2. **One assertion per test** (when possible)
   ```typescript
   it("should return status code 200")
   it("should include user data in response")
   ```

3. **Arrange-Act-Assert pattern**
   ```typescript
   it("should calculate total", () => {
     // Arrange
     const items = [1, 2, 3];
     
     // Act
     const total = sum(items);
     
     // Assert
     expect(total).toBe(6);
   });
   ```

4. **Test edge cases**
   - Empty inputs
   - Null/undefined
   - Maximum values
   - Invalid types
   - Error conditions

5. **Clean up after tests**
   ```typescript
   afterEach(() => {
     // Reset mocks
     vi.restoreAllMocks();
   });
   ```

## Examples

### Testing Backend Route

```typescript
describe("Status Route", () => {
  it("should return server status", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/status",
      headers: { "x-api-key": TEST_API_KEY },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toHaveProperty("online");
    expect(body.status.playerCount).toBeGreaterThanOrEqual(0);
  });
});
```

### Testing Discord Command

```typescript
describe("Status Command", () => {
  it("should create status embed", () => {
    const mockStatus = {
      status: { online: true, playerCount: 5 },
    };
    
    const embed = createStatusEmbed(mockStatus);
    expect(embed.data.fields).toHaveLength(6);
    expect(embed.data.color).toBeDefined();
  });
});
```

### Testing Error Handling

```typescript
describe("Error Handling", () => {
  it("should throw ValidationError for invalid input", () => {
    expect(() => {
      validateInput({ invalid: "data" });
    }).toThrow(ValidationError);
  });

  it("should return proper error response", async () => {
    const response = await server.inject({
      url: "/api/invalid",
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
```

## Performance Testing

```typescript
import { performance } from "perf_hooks";

it("should complete within 100ms", async () => {
  const start = performance.now();
  await fastOperation();
  const duration = performance.now() - start;
  
  expect(duration).toBeLessThan(100);
});
```

## Integration vs Unit Tests

**Unit Tests:**
- Test individual functions
- Mock dependencies
- Fast execution
- High coverage

**Integration Tests:**
- Test entire request flow
- Real dependencies (when possible)
- Slower execution
- Real-world scenarios

This project uses primarily integration tests for backend routes and unit tests for utilities.

## Running Tests in CI/CD

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install
      - run: npm test
```

---

For more information, see [DEVELOPMENT.md](./DEVELOPMENT.md)
