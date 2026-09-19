# Contributing to gz-terminalforge

Thanks for your interest in contributing!

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
npx tsc --noEmit

# Build
bun run build
```

## Pull Requests

1. Fork the repo and create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass: `bun test`
4. Ensure type check passes: `npx tsc --noEmit`
5. Submit a PR with a clear description

## Adding Commands

CLI commands live in `src/cli.ts`. Each command:

- Has a usage line in `usage()`
- Validates its arguments and sets `process.exitCode = 1` on error
- Prints human-readable output (no JSON unless it's `health`)

Add tests in `test/cli.test.ts` for every new command.

## SQLite Compatibility

The DB adapter in `src/sqlite.ts` supports both `node:sqlite` (Node 22.5+) and `bun:sqlite` (Bun). Keep it dependency-free — do not add a SQLite npm package.

## Code Style

- TypeScript strict mode
- ES modules (`import`/`export`)
- Zero runtime dependencies
- Tests for all new features

## License

By contributing, you agree that your contributions will be licensed under the MIT License.