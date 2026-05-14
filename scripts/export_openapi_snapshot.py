import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import json
from backend.main import app


OUT_PATH = ROOT / 'contracts/openapi.snapshot.json'


def main() -> None:
    schema = app.openapi()
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(schema, ensure_ascii=False, indent=2) + '\n')
    print(f'Wrote OpenAPI snapshot to {OUT_PATH}')


if __name__ == '__main__':
    main()
