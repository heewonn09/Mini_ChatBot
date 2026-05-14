import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import json
from pathlib import Path

SNAPSHOT = ROOT / 'contracts/openapi.snapshot.json'


class ContractError(RuntimeError):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ContractError(message)


def main() -> None:
    _require(SNAPSHOT.exists(), f'Missing snapshot: {SNAPSHOT}. Run export script first.')
    doc = json.loads(SNAPSHOT.read_text())

    components = doc.get('components', {}).get('schemas', {})
    analysis_response = components.get('AnalysisResponse', {})
    props = analysis_response.get('properties', {})

    _require('thresholds' in props, 'AnalysisResponse.properties.thresholds is missing')

    thresholds = components.get('AnalysisThresholds', {})
    threshold_props = thresholds.get('properties', {})

    required_fields = {
        'negative_emotion_ratio_threshold',
        'negative_emotion_intensity_threshold',
        'mood_swing_threshold',
        'high_severity_ratio_threshold',
    }
    missing = sorted(required_fields - set(threshold_props.keys()))
    _require(not missing, f'AnalysisThresholds missing properties: {missing}')

    print('Contract verification passed for AnalysisResponse/AnalysisThresholds')


if __name__ == '__main__':
    main()
