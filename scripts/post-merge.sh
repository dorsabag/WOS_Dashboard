#!/bin/bash
set -euo pipefail
pnpm install --frozen-lockfile
# Schema changes are explicit operator actions against a verified development target.
