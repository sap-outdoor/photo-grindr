import importlib
import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture
def app(tmp_path):
    assert (Path(__file__).resolve().parents[1] / 'app.py').exists(), 'backend app factory missing'
    backend = importlib.import_module('app')
    root = tmp_path / 'photos'
    for folder in backend.SOURCE_ALLOWLIST:
        (root / folder).mkdir(parents=True)
    for n in range(7):
        Image.new('RGB', (120, 80), 'red').save(root / backend.SOURCE_ALLOWLIST[n % 2] / f'{n:03}.jpg')
    clock = [1000.0]
    app = backend.create_app({'TESTING': True, 'PHOTO_DIR': str(root), 'DATA_DIR': str(tmp_path / 'data'), 'NOW': lambda: clock[0], 'SECRET_KEY': 'test-secret'})
    app.clock = clock
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def enter(client, name=None):
    with client.session_transaction() as state:
        state['csrf_token'] = 'test-csrf'
    response = client.post('/enter', data={'pin': '2026', 'csrf_token': 'test-csrf'})
    assert response.status_code == 302
    if name:
        response = post(client, '/api/player', {'username': name})
        assert response.status_code == 200, response.json
    return client


def post(client, path, data):
    return client.post(path, json=data, headers={'X-CSRF-Token': 'test-csrf'})
