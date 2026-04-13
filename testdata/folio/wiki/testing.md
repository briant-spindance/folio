---
title: Testing
modified: "2026-04-12"
icon: file-text
order: 6
---

## Overview

Folio maintains a comprehensive testing strategy covering the Go backend, TypeScript frontend, and CLI to ensure reliability and quality across the entire stack.

## Testing Principles

- **Local-first**: All tests run locally without external dependencies
- **Fast feedback**: Unit tests complete in seconds; integration tests in under a minute
- **Deterministic**: Tests use fixed data and avoid flaky timing dependencies
- **Realistic**: Test data lives in `testdata/` and mirrors real project structure

## Backend Testing (Go)

### Unit Tests

Run the full Go test suite:

```bash
go test ./...
```

Run with coverage:

```bash
go test -cover ./...
```

### Test Structure

- Tests live alongside source files as `*_test.go`
- Use table-driven tests for multiple scenarios
- Mock file system interactions using `testdata/` fixtures

### Example Test Pattern

```go
func TestProjectLoader(t *testing.T) {
    tests := []struct {
        name    string
        path    string
        wantErr bool
    }{
        {"valid project", "testdata/folio", false},
        {"missing config", "testdata/empty", true},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            _, err := LoadProject(tt.path)
            if (err != nil) != tt.wantErr {
                t.Errorf("got error %v, wantErr %v", err, tt.wantErr)
            }
        })
    }
}
```

## Frontend Testing (TypeScript)

### Unit Tests (Vitest)

Run frontend unit tests:

```bash
npm test
```

Watch mode for development:

```bash
npm test -- --watch
```

### Component Testing

- Use Vitest + React Testing Library for component tests
- Test user interactions and state changes
- Mock API calls using MSW (Mock Service Worker)

### Example Component Test

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FeatureCard } from './FeatureCard'

describe('FeatureCard', () => {
  it('renders feature details', () => {
    render(<FeatureCard title="Test" status="draft" priority="high" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()
  })
})
```

## Integration Testing

### API Integration Tests

Integration tests verify the full request/response cycle between frontend and backend:

```bash
# Start the test server
npm run dev

# Run integration tests
npm run test:integration
```

These tests:
- Use the Hono test server with `testdata/folio/` project
- Verify JSON API contracts
- Test authentication flows and permissions
- Validate error handling

### CLI Integration Tests

Test CLI commands against real project data:

```bash
go test ./cmd/... -tags=integration
```

CLI tests verify:
- Command parsing and execution
- File system operations
- Output formatting (JSON, table, etc.)
- Error messages

## Test Data

### testdata/ Structure

```
testdata/
└── folio/              # Complete test project
    ├── .folio/
    │   └── config.yaml
    ├── features/
    ├── wiki/
    └── tasks/
```

### Maintaining Test Data

- Keep `testdata/folio/` synchronized with schema changes
- Use realistic but minimal data sets
- Document any special test scenarios in comments

## Continuous Integration

### Pre-commit Checks

Before committing, ensure all tests pass:

```bash
# Backend
go test ./...

# Frontend
npm test

# Linting
go vet ./...
npm run lint
```

### CI Pipeline

On pull requests, automated tests run:

1. Go unit tests across multiple OS (Linux, macOS, Windows)
2. Frontend unit tests
3. Integration tests
4. Linting and formatting checks
5. Build verification

## Coverage Goals

- **Backend**: Maintain >80% code coverage for core packages
- **Frontend**: >70% coverage for components and utilities
- **Critical paths**: 100% coverage for auth, data persistence, and API contracts

## Writing Good Tests

### Do

- Test behavior, not implementation
- Use descriptive test names that explain the scenario
- Keep tests isolated and independent
- Test error cases and edge conditions

### Don't

- Test private functions directly (test through public API)
- Depend on test execution order
- Use sleeps or arbitrary timeouts
- Share mutable state between tests

## Debugging Failed Tests

### Verbose Output

```bash
# Go
go test -v ./...

# Frontend
npm test -- --reporter=verbose
```

### Running Single Tests

```bash
# Go
go test -run TestSpecificFunction

# Frontend
npm test -- FeatureCard
```

### Debug Mode

```bash
# Frontend with debugging
npm test -- --inspect-brk
```

## Performance Testing

For performance-critical code:

```bash
# Go benchmarks
go test -bench=. -benchmem ./...
```

Benchmark critical operations:
- Project loading and parsing
- Feature file writes
- API response serialization

## Future Enhancements

- [ ] E2E tests with Playwright
- [ ] Visual regression testing for UI components
- [ ] Performance regression tracking
- [ ] Mutation testing for test quality





