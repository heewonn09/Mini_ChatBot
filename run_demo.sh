#!/usr/bin/env bash
set -e

python -m pip install -r backend/requirements.txt
python scripts/demo_seed.py

(cd frontend && npm install && npm run build >/dev/null)

echo "Demo seed completed."
echo "Backend: uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
echo "Frontend: cd frontend && npm run dev"
