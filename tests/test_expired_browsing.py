"""Expired work must not gate unrelated browsing, exports or return requests."""
from uuid import uuid4
from conftest import enter, post
from test_backend import setup_package, vote


def test_expired_player_can_explore_export_return_without_requesting_new_package(app, client):
    package = setup_package(app, client, 'džoudy')
    saved = vote(client, package).json['package']
    app.clock[0] = 1600
    state = client.get('/api/state').json
    assert state['expired'] is True
    # This is the exact click path: state -> activity -> gallery, with NO allocation.
    assert post(client, '/api/activity', {}).status_code == 200
    gallery = client.get('/api/gallery?status=liked')
    assert gallery.status_code == 200
    assert gallery.json['total'] == 1
    assert client.get('/export.csv').status_code == 200
    item = gallery.json['items'][0]
    returned = post(client, '/api/return', {
        'photo_ids':[item['id']], 'versions':{str(item['id']):item['version']},
        'request_id':str(uuid4()),
    })
    assert returned.status_code == 200
    assert vote(client, saved, saved['items'][1]).status_code == 409
    assert post(client, '/api/navigate', {'package_id':package['id'],'position':1}).status_code == 409
    assert client.get('/api/state').json['counts']['pending'] == 7


def test_expiry_notification_identifies_package_without_renewing_old_work(app, client):
    package = setup_package(app, client)
    assert client.get('/api/state').json.get('expired_package_id') is None
    app.clock[0] = 1600
    state = client.get('/api/state').json
    assert state.get('expired_package_id') == package['id']
    assert post(client, '/api/activity', {}).status_code == 200
    assert client.get('/api/state').json.get('expired_package_id') == package['id']
    replacement = post(client, '/api/packages', {'size':50}).json['package']
    assert replacement['id'] != package['id']
    app.clock[0] = 2200
    assert client.get('/api/state').json.get('expired_package_id') == replacement['id']
