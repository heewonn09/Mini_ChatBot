.PHONY: check check-backend check-frontend check-contract

check: check-backend check-frontend check-contract

check-backend:
	PYTHONPATH=. pytest backend/tests -q

check-frontend:
	cd frontend && npm run lint && npm run test -- --run

check-contract:
	PYTHONPATH=. python scripts/export_openapi_snapshot.py
	python scripts/verify_analysis_contract.py
