#!/usr/bin/env bash
set -euo pipefail

cp -n .env.example .env || true
npm install
docker compose up -d mongo redis

