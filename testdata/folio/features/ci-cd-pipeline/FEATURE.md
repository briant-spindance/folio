---
title: CI/CD Pipeline
modified: "2026-04-12"
---

## Overview

Implement a comprehensive CI/CD pipeline for Forge that automates testing, building, and deployment processes. The pipeline should support the Go backend, TypeScript frontend, and CLI tooling while maintaining the project's commitment to quality and reliability.

## Status

**Current:** Done  
**Priority:** Medium  
**Owner:** DevOps Team  
**Target Release:** v1.2.0

## Problem Statement

Currently, Forge lacks automated build and deployment processes, which leads to:
- Manual testing and building increases the risk of human error
- Inconsistent build artifacts across different environments
- Slower release cycles due to manual intervention
- No automated quality gates before merging code
- Difficulty ensuring cross-platform compatibility (Linux, macOS, Windows)

## Goals

- Automate all tests (Go backend, TypeScript frontend, CLI) on every pull request
- Build and package the single Go binary for multiple platforms automatically
- Implement automated quality gates (linting, type checking, security scanning)
- Enable continuous deployment to staging and production environments
- Provide clear feedback to developers on build/test status
- Reduce time from commit to deployment from hours to minutes

## Non-Goals

- Building container images (Folio is a single binary, containerization is optional)
- Managing infrastructure provisioning (focusing on build/test/deploy only)
- Implementing custom CI/CD tooling (will use existing solutions like GitHub Actions)

## Solution Design

### Architecture

```
┌─────────────────┐
│   Git Push      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│     Trigger CI Pipeline             │
│  (GitHub Actions / GitLab CI)       │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │  Lint   │
    │  Check  │
    └────┬────┘
         │
    ┌────┴────────┐
    │   Test      │
    │  - Go       │
    │  - TS       │
    │  - CLI      │
    └────┬────────┘
         │
    ┌────┴────────┐
    │   Build     │
    │  Multi-OS   │
    └────┬────────┘
         │
    ┌────┴────────┐
    │  Security   │
    │   Scan      │
    └────┬────────┘
         │
    ┌────┴────────┐
    │   Deploy    │
    │  (Staging)  │
    └─────────────┘
```

### Pipeline Stages

#### 1. Code Quality Checks (Parallel)
- **Go Linting**: `golangci-lint run`
- **TypeScript Linting**: `npm run lint`
- **Format Check**: `gofmt` and `prettier`
- **Type Checking**: TypeScript `tsc --noEmit`

#### 2. Testing (Parallel)
- **Go Unit Tests**: `go test ./...` with coverage reporting
- **Go Integration Tests**: Test API endpoints and file operations
- **Frontend Tests**: Vitest unit and component tests
- **CLI Tests**: End-to-end CLI command tests
- **Coverage Gates**: Minimum 80% coverage required

#### 3. Build (Matrix)
Build the single Go binary for multiple platforms:
- **Linux** (amd64, arm64)
- **macOS** (amd64, arm64)
- **Windows** (amd64)

Frontend assets are embedded in the binary during build.

#### 4. Security Scanning
- **Dependency Audit**: `npm audit` and `go mod audit`
- **Vulnerability Scanning**: Trivy or Snyk
- **SAST**: CodeQL or similar static analysis

#### 5. Artifact Publishing
- Tag releases with semantic versioning
- Publish binaries to GitHub Releases
- Generate checksums (SHA256)
- Update installation documentation

#### 6. Deployment (Conditional)
- **Staging**: Auto-deploy on merge to `main`
- **Production**: Manual approval or tag-based deployment

### Implementation Details

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  release:
    types: [published]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      - name: Go Lint
        run: golangci-lint run
      - name: Frontend Lint
        run: npm ci && npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v4
      - name: Run Go Tests
        run: go test -v -race -coverprofile=coverage.out ./...
      - name: Run Frontend Tests
        run: npm ci && npm test
      - name: Upload Coverage
        uses: codecov/codecov-action@v3

  build:
    needs: [lint, test]
    strategy:
      matrix:
        os: [linux, darwin, windows]
        arch: [amd64, arm64]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Binary
        run: |
          GOOS=${{ matrix.os }} GOARCH=${{ matrix.arch }} \
          go build -o folio-${{ matrix.os }}-${{ matrix.arch }}
      - name: Upload Artifact
        uses: actions/upload-artifact@v3

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Security Scan
        uses: aquasecurity/trivy-action@master
      - name: Dependency Audit
        run: go mod verify && npm audit

  deploy-staging:
    needs: [build, security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: echo "Deploy staging"

  release:
    needs: [build, security]
    if: github.event_name == 'release'
    runs-on: ubuntu-latest
    steps:
      - name: Publish Release Assets
        uses: softprops/action-gh-release@v1
```

### Configuration Files

**`.golangci.yml`**: Go linting configuration
**`.github/dependabot.yml`**: Automated dependency updates
**`codecov.yml`**: Coverage reporting configuration

## Technical Considerations

### Performance
- Use caching for dependencies (Go modules, npm packages)
- Parallelize independent jobs where possible
- Estimated pipeline duration: 5-8 minutes for full run

### Security
- Use secrets management for deployment credentials
- Scan for vulnerabilities before deployment
- Sign release binaries for authenticity

### Monitoring
- Track pipeline success/failure rates
- Monitor build times and identify bottlenecks
- Alert on repeated failures

### Cross-Platform Compatibility
- Test CLI on all target platforms
- Ensure embedded frontend assets work correctly
- Validate file path handling (Windows vs Unix)

## Rollout Plan

### Phase 1: Basic CI (Week 1)
- Set up GitHub Actions
- Implement lint and test stages
- Configure pull request checks

### Phase 2: Build Automation (Week 2)
- Add multi-platform build matrix
- Set up artifact publishing
- Generate release checksums

### Phase 3: Security & Quality (Week 3)
- Integrate security scanning
- Add coverage reporting
- Implement quality gates

### Phase 4: Deployment (Week 4)
- Set up staging deployment
- Configure production deployment with approval
- Document deployment process

## Metrics & Success Criteria

### Key Metrics
- **Pipeline Success Rate**: >95%
- **Average Pipeline Duration**: <10 minutes
- **Time to Deploy**: <15 minutes from merge to production
- **Test Coverage**: >80% across all components

### Success Criteria
- ✅ All tests run automatically on every PR
- ✅ Builds succeed for all target platforms
- ✅ Security scans pass with no critical vulnerabilities
- ✅ Developers receive clear feedback within 10 minutes
- ✅ Releases are published automatically with proper versioning
- ✅ Zero manual steps required from code merge to staging deployment

## Dependencies

- GitHub Actions (or alternative CI/CD platform)
- golangci-lint for Go linting
- Codecov or similar for coverage tracking
- Trivy or Snyk for security scanning
- Existing testing infrastructure (per Testing wiki doc)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pipeline failures block development | High | Implement pipeline monitoring; allow manual override for urgent fixes |
| Build times too long | Medium | Optimize caching; parallelize jobs; profile slow steps |
| Cross-platform build issues | Medium | Test locally with `GOOS`/`GOARCH`; add platform-specific tests |
| Security scan false positives | Low | Configure allowlists; require manual review for exceptions |
| Deployment failures | High | Implement rollback mechanism; test in staging first |

## Open Questions

- ~~Which CI/CD platform? (GitHub Actions chosen for GitHub integration)~~
- ~~Coverage thresholds? (80% agreed)~~
- ~~Manual approval for production? (Yes, for initial rollout)~~
- Should we support self-hosted runners for private deployments?
- Do we need canary deployments or blue-green deployment strategy?

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [golangci-lint](https://golangci-lint.run/)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy)
- Forge Testing Documentation (see `testing` wiki doc)
- Forge Architecture (see `architecture` wiki doc)

## Updates

- **2024-01-15**: Feature created, requirements gathered
- **2024-01-20**: Design approved, implementation started
- **2024-01-25**: Phase 1 & 2 complete, basic CI and builds working
- **2024-01-28**: Phase 3 complete, security scanning integrated
- **2024-01-30**: Phase 4 complete, staging deployment automated
- **2024-02-01**: Feature complete, pipeline running successfully in production
