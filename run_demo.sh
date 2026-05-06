#!/usr/bin/env bash
set -e
python scripts_demo_seed.py
(cd frontend && npm install && npm run build >/dev/null)
echo "Demo ready. Run backend: uvicorn backend.main:app --reload"
echo "Run frontend: cd frontend && npm run dev"
