# Local entry points. Mirrors the CI job list exactly, so "it passes locally"
# and "it passes in CI" mean the same thing.
SHELL := /usr/bin/env bash
TSNODE := node_modules/.bin/ts-node

.PHONY: help install build test coverage lint tools verify audit check clean

help:
	@echo "install   -- pnpm install --frozen-lockfile (frozen -- gate G4)"
	@echo "build     -- tsc --noEmit, tsc emit, vite bundle + run it"
	@echo "test      -- mocha over tests/"
	@echo "coverage  -- c8, nyc+ts-node and vitest: three independent numbers"
	@echo "lint      -- eslint, sonarjs, security"
	@echo "tools     -- run EVERY wired tool runner"
	@echo "verify    -- tool_integration --verify"
	@echo "check     -- full_check.ts cross-file consistency audit"

install:
	pnpm install --frozen-lockfile

build:
	bash tools/typescript/run_tsc.sh
	bash tools/vite/run_vite.sh

test:
	bash tools/mocha/run_mocha.sh

coverage:
	bash tools/c8/run_c8.sh
	bash tools/nyc/run_nyc.sh
	bash tools/vitest/run_vitest.sh

lint:
	bash tools/eslint/run_eslint.sh
	bash tools/sonarjs/run_sonarjs.sh
	bash tools/security/run_security.sh
	bash tools/biome/run_biome.sh

verify:
	$(TSNODE) tools/tool_integration.ts --verify

tools:
	$(TSNODE) tools/tool_integration.ts --run-all

audit:
	bash tools/npm-audit/run_npm_audit.sh

check:
	$(TSNODE) tools/full_check.ts

clean:
	rm -rf dist build reports coverage coverage-nyc .nyc_output .c8_output .stryker-tmp
