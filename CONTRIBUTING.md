# Contributing

We welcome contributions! Here's how to help.

## Development Environment

1. Follow [DEVELOPMENT.md](./DEVELOPMENT.md) to set up local development
2. Create a new branch for your feature/fix
3. Make your changes with clear, descriptive commits
4. Test thoroughly before submitting

## Code Standards

### TypeScript

- Strict mode enabled
- No `any` types (use generics or unions instead)
- Export interfaces and types explicitly
- Use `const` over `let` over `var`

### File Organization

```typescript
// 1. Imports
import { type Interface } from "@mc-bot/shared";

// 2. Types/Interfaces
interface MyInterface {
  property: string;
}

// 3. Implementation
export class MyClass {
  // ...
}

// 4. Exports
export default MyClass;
```

### Naming Conventions

- Classes: PascalCase (`MyClass`, `UserService`)
- Functions: camelCase (`myFunction`, `getUserById`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_TIMEOUT`)
- Types: PascalCase (`UserType`, `ConfigSchema`)

## Commit Messages

Format: `<type>: <description>`

Types:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructure
- `docs` - Documentation
- `test` - Tests
- `chore` - Dependencies/config
- `perf` - Performance improvement

Examples:
```
feat: add plugin installation from Modrinth
fix: resolve API key validation issue
docs: update deployment guide
```

## Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/xyz`
3. Make changes with clean commits
4. Update documentation if needed
5. Test thoroughly
6. Push to your fork
7. Create pull request with clear description

## Areas for Contribution

### High Priority

- [ ] Plugin upload validation and security
- [ ] Server restart with safe shutdown sequence
- [ ] Real-time server monitoring via WebSocket
- [ ] Plugin version management and rollback
- [ ] Minecraft server property editing via API
- [ ] Player ban/kick functionality
- [ ] World backup management

### Medium Priority

- [ ] Database persistence (currently in-memory)
- [ ] Redis caching for Modrinth API
- [ ] SSL/TLS certificate management
- [ ] Multi-server management
- [ ] Advanced analytics/metrics

### Nice to Have

- [ ] Web dashboard (REST client UI)
- [ ] Mobile-friendly Discord slash command documentation
- [ ] Mod compilation/packaging tools
- [ ] Server performance optimization advisor

## Testing

```bash
# Write tests in __tests__ directories
backend/src/__tests__/api.test.ts
bot/src/__tests__/commands.test.ts

# Run tests
npm test

# Test specific file
npm test -- status.test.ts
```

Test template:
```typescript
import { describe, it, expect } from "vitest";

describe("MyFeature", () => {
  it("should do something", () => {
    expect(result).toBe(expected);
  });
});
```

## Security

- Never commit `.env` files or secrets
- Sanitize user inputs (path traversal, injection)
- Validate file uploads
- Use API key authentication
- Implement rate limiting
- Handle errors gracefully (don't expose stack traces in production)

## Documentation

- Update README.md if adding new features
- Document complex logic with comments
- Keep API documentation synchronized
- Update DEPLOYMENT.md for deployment changes

## Questions?

- Open an issue for bugs/questions
- Check existing issues before opening new ones
- Use clear, descriptive titles
- Provide reproduction steps for bugs

Thank you for contributing! 🙏
