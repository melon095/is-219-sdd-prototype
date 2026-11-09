# Varodd Constitution

## Core Principles

### I. Single Shared Codebase

All Varodd features — including `001-job-matching-marketplace` and `002-shared-knowledge-base`,
and any future features — MUST be implemented in one shared codebase/prototype rather than
separate repositories. A feature MAY be structured internally as a distinct service or module,
but every feature MUST share one codebase, one set of technology-stack decisions, and one
coordinated deployment unit for the prototype. A concept used by more than one feature (for
example, "partner business" eligibility) MUST be implemented once and reused by every feature
that needs it, rather than being reimplemented separately per feature.

**Rationale**: Varodd's features are different facets of one product, built with limited
resources. Separate repositories or duplicated implementations of shared concepts would multiply
maintenance cost and let the features drift out of sync with each other.

### II. Sandboxed/Fake Data Only

This codebase is a prototype. All external data it has access to or interacts with — NAV
referrals/integration, crawled partner-business data, and any customer or business data — MUST be
fake/simulated, not real. The system MUST NOT make real NAV API calls, MUST NOT crawl real
business websites, and MUST NOT ingest or store real customer or business data. Every feature's
plan and tests MUST use fixtures, mocks, or seed data to stand in for these external sources.

**Rationale**: As a prototype, the system has not been through the legal, security, or data-
protection review real NAV, customer, or business data would require. Faking all external data
keeps the prototype safe to build and demo without that review, and without risk to real people
or businesses.

### III. Test-Driven Development

The project MUST be test-driven. Tests for a piece of functionality MUST be written before, or
alongside and gating, its implementation. A task or user story MUST NOT be considered done until
its tests pass.

**Rationale**: Test-first development catches regressions early and keeps each user story's
"independently testable" acceptance scenarios (as defined in each feature's spec) verifiable by an
actual automated check, not just a claim.

## Governance

This constitution governs cross-feature architectural decisions and supersedes conflicting
guidance elsewhere in the repository on those decisions. Amendments MUST be made via
`/speckit-constitution`, with the version bumped per semantic versioning: MAJOR for
backward-incompatible removal or redefinition of a principle, MINOR for a new or materially
expanded principle, PATCH for wording clarifications. Every `/speckit-plan` run MUST complete its
Constitution Check against the principles in this document before Phase 0 research begins; any
violation MUST either be resolved within the plan or explicitly justified in that plan's
Complexity Tracking section.

**Version**: 1.1.0 | **Ratified**: 2026-11-09 | **Last Amended**: 2026-11-09
