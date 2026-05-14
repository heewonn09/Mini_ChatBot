from fastapi.testclient import TestClient

from backend.main import app


def test_health_endpoint_shape():
    client = TestClient(app)

    response = client.get('/health')

    assert response.status_code == 200
    data = response.json()
    assert 'status' in data
    assert 'checks' in data
    assert 'database' in data['checks']
    assert 'redis' in data['checks']
