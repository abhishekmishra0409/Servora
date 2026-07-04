#!/usr/bin/env bash
set -euo pipefail

cp -n .env.example .env || true
npm install
# Single-node deploy: only Mongo is needed. (There is no redis service in
# docker-compose.yml; realtime runs in-process on the API.)
docker compose up -d mongo

