# TypeCast

A movie search application built around a from-scratch search-as-you-type
implementation.

## About

TypeCast is a full-stack learning project. The focus is the autocomplete —
debouncing, in-flight request cancellation, client-side caching, a
self-owned prefix index, keyboard navigation, and ARIA combobox semantics,
all implemented directly rather than pulled from a library.

The search component is deliberately data-source agnostic. It sits behind a
provider interface, so the underlying dataset is swappable. TMDB is the
first implementation, not a dependency of the design.

Movie data comes from TMDB, but the autocomplete index is built and ranked
locally from TMDB's daily ID exports rather than proxied from a third-party
suggestion endpoint.

## Tech Stack

**Framework**
- Next.js (App Router, Route Handlers as the API)
- TypeScript
- React

**Database**
- Neon (Postgres)
- Drizzle ORM
- Drizzle Kit (migrations)
- `@neondatabase/serverless`

**Auth**
- Better Auth (Drizzle adapter, email/password with verification)

**Validation**
- Zod
- `drizzle-zod`
- `@t3-oss/env-nextjs`

**Cache & Rate Limiting**
- Upstash Redis

**Data Source**
- TMDB API (detail data)
- TMDB daily ID exports (bulk seed and daily deltas)

**Styling**
- CSS custom properties for design tokens
- Dark default, light available

**Testing & Quality**
- Vitest (unit)
- Testing Library (component)
- Playwright (E2E)
- MSW (API mocking)
- `@axe-core/playwright` (accessibility)
- Lighthouse CI (performance budgets)

**Tooling**
- pnpm
- Biome (lint and format)
- GitHub Actions

**Observability & Security**
- Sentry
- Aikido (SAST, SCA, secrets detection)

**Deployment**
- Vercel
- Neon
- Upstash

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

## Disclaimer

This project is provided for demonstration and portfolio purposes. It is
supplied as is, without warranty of any kind, express or implied. No
guarantee is made regarding accuracy, availability, or fitness for any
particular purpose. Use at your own risk.

TMDB data is used under TMDB's non-commercial terms. This project is not
affiliated with TMDB.

## Intellectual Property

Copyright (c) 2026 Sauel Almonte. All rights reserved.

This repository is **not** open source. No license is granted to any person
to use, copy, modify, merge, publish, distribute, sublicense, or sell any
portion of this software.

The source code, architecture, design, and documentation contained in this
repository are the intellectual property of the author. Viewing this
repository for evaluation purposes does not confer any rights to its
contents.

Unauthorized use, reproduction, or derivative work is prohibited.