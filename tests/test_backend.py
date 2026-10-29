from conftest import enter, post
from app import index_library
from uuid import uuid4


def setup_package(app, client, name='Alice'):
    with app.app_context():
        index_library()
    enter(client, name)
    return post(client, '/api/packages', {'size': 50}).json['package']


def vote(client, package, item=None, value='liked', request_id=None):
    item = item or package['items'][0]
    return post(client, '/api/decision', dict(package_id=package['id'],photo_id=item['id'],value=value,version=item['version'],request_id=request_id or str(uuid4())))


def test_decision_navigation_gallery_export_history(app, client):
    package = setup_package(app, client)
    nav = post(client, '/api/navigate', {'package_id': package['id'], 'position': 2})
    assert nav.status_code == 200
    assert nav.json['package']['answered'] == 0
    request_id = str(uuid4())
    saved = vote(client, package, request_id=request_id)
    assert saved.status_code == 200
    assert saved.json['package']['answered'] == 1
    assert vote(client, package, request_id=request_id).json == saved.json
    assert vote(client, package).status_code == 409
    gallery = client.get('/api/gallery?status=liked&page=1').json
    assert gallery['total'] == 1
    assert gallery['items'][0]['judged_by'] == 'Alice'
    assert package['items'][0]['relative_path'] in client.get('/export.csv').text
    assert client.get(f"/api/photos/{package['items'][0]['id']}/history").json['events'][0]['action'] == 'liked'
    current = saved.json['package']
    for item in current['items'][1:]:
        result = vote(client, current, item, 'disliked')
        assert result.status_code == 200
    assert result.json['complete'] is True
    assert client.get('/api/gallery?status=disliked').json['total'] == 6



def test_expiry_boundary_passive_and_shared_devices(app, client):
    package = setup_package(app, client)
    saved = vote(client,package).json['package']
    app.clock[0] = 1599.999
    assert client.get('/api/state').json['expired'] is False
    assert client.get('/api/gallery').status_code == 200
    app.clock[0] = 1600
    late = vote(client,saved,saved['items'][1])
    assert late.status_code == 409
    assert late.json['code'] == 'expired'
    assert client.get('/api/state').json['counts']['liked'] == 1
    assert client.get('/api/state').json['counts']['pending'] == 6
    assert client.get('/api/state').json['expired'] is True
    expired_read = client.get(f"/api/packages/{package['id']}")
    assert expired_read.status_code == 409
    assert expired_read.json['code'] == 'expired'
    # Activity is unrelated to the expired assignment; the stale votes above remain blocked.
    assert post(client,'/api/activity',{}).status_code == 200
    fresh = post(client,'/api/packages',{'size': 50}).json['package']
    assert fresh['id'] != package['id']
    assert vote(client,package).status_code == 409
    second = enter(app.test_client(),'Alice')
    app.clock[0] = 2100
    assert post(second,'/api/activity',{}).status_code == 200
    app.clock[0] = 2600
    assert client.get('/api/state').json['expired'] is False
    app.clock[0] = 2700
    assert post(client,'/api/navigate',{'package_id':fresh['id'],'position':0}).status_code == 409


def test_expired_player_can_use_gallery_after_empty_allocation(app, client):
    package = setup_package(app, client)
    saved = vote(client, package).json['package']
    app.clock[0] = 1600
    bob = enter(app.test_client(), 'Bob')
    assert post(bob, '/api/packages', {'size': 50}).json['package']['total'] == 6
    assert client.get('/api/state').json['expired'] is True
    assert post(client, '/api/packages', {'size': 50}).json['package'] is None
    assert post(client, '/api/activity', {}).status_code == 200
    gallery = client.get('/api/gallery?status=liked')
    assert gallery.status_code == 200
    assert gallery.json['total'] == 1
    exported = client.get('/export.csv')
    assert exported.status_code == 200
    assert saved['items'][0]['relative_path'] in exported.text
    assert client.get('/api/state').json['expired'] is True
    assert vote(client, saved, saved['items'][1]).status_code == 409
    assert post(client, '/api/navigate', {'package_id': package['id'], 'position': 1}).status_code == 409
    item = gallery.json['items'][0]
    assert post(client, '/api/return', {'photo_ids': [item['id']], 'versions': {str(item['id']): item['version']}, 'request_id': str(uuid4())}).status_code == 200


def test_undo_replay_does_not_undo_second_action(app, client):
    package = setup_package(app, client)
    package = vote(client, package).json['package']
    package = vote(client, package, package['items'][1]).json['package']
    body = {'request_id': str(uuid4())}
    committed = post(client, '/api/undo', body)
    assert committed.status_code == 200
    assert committed.json['package']['answered'] == 1
    assert post(client, '/api/undo', body).json == committed.json
    assert client.get('/api/state').json['counts']['liked'] == 1
    actions = [event['action'] for event in client.get(f"/api/photos/{package['items'][1]['id']}/history").json['events']]
    assert actions == ['liked', 'undo']


def test_return_undo_and_interleaved_conflict(app, client):
    package = setup_package(app,client)
    package = vote(client,package).json['package']
    item = package['items'][0]
    undo_id = str(uuid4())
    undone = post(client,'/api/undo',{'request_id':undo_id})
    assert undone.status_code == 200
    assert undone.json['package']['answered'] == 0
    assert undone.json == post(client,'/api/undo',{'request_id':undo_id}).json
    package = vote(client,undone.json['package']).json['package']
    item = package['items'][0]
    bob = enter(app.test_client(),'Bob')
    body = {'photo_ids':[item['id']],'versions':{str(item['id']):item['version']},'request_id':str(uuid4())}
    returned = post(bob,'/api/return',body)
    assert returned.status_code == 200
    assert post(bob,'/api/return',body).status_code == 200
    assert client.get('/api/gallery?status=liked').json['total'] == 0
    assert item['relative_path'] not in client.get('/export.csv').text
    assert post(client,'/api/undo',{'request_id':str(uuid4())}).status_code == 409
    undone_return = post(bob,'/api/undo',{'request_id':str(uuid4())})
    assert undone_return.status_code == 200
    assert client.get('/api/gallery?status=liked').json['total'] == 1
    item = client.get('/api/gallery?status=liked').json['items'][0]
    body = {'photo_ids':[item['id']],'versions':{str(item['id']):item['version']},'request_id':str(uuid4())}
    assert post(bob,'/api/return',body).status_code == 200
    assert post(bob,'/api/return',dict(body,request_id=str(uuid4()))).status_code == 409
    re_review = post(bob,'/api/packages',{'size':50}).json['package']
    assert re_review['items'][0]['id'] == item['id']
    assert post(bob,'/api/undo',{'request_id':str(uuid4())}).status_code == 409
    assert vote(bob,re_review,value='disliked').status_code == 200
    assert vote(client,package).status_code == 409
    actions = [e['action'] for e in client.get(f"/api/photos/{item['id']}/history").json['events']]
    assert actions == ['liked','undo','liked','returned','undo','returned','disliked']


def test_previews_orientation_missing_corrupt_and_replaced(app,client):
    from pathlib import Path
    from PIL import Image
    import io
    root = Path(app.config['PHOTO_DIR'])
    folder = root / 'Hana Valdová/watermarked'
    image = Image.new('RGB',(120,80),'blue')
    exif = image.getexif()
    exif[274] = 6
    image.save(folder / 'oriented.jpg',exif=exif)
    (folder / 'broken.jpg').write_bytes(b'not an image')
    (root / 'unwatermarked').mkdir()
    image.save(root / 'unwatermarked/no.jpg')
    package = setup_package(app,client)
    assert package['total'] == 9
    oriented = next(i for i in package['items'] if i['filename']=='oriented.jpg')
    original = (folder / 'oriented.jpg').read_bytes()
    preview = client.get(oriented['preview_url'])
    assert preview.status_code == 200
    assert preview.mimetype == 'image/jpeg'
    assert Image.open(io.BytesIO(preview.data)).size == (80,120)
    assert client.get(oriented['preview_url']).data == preview.data
    assert (folder / 'oriented.jpg').read_bytes() == original
    broken = next(i for i in package['items'] if i['filename']=='broken.jpg')
    assert client.get(broken['preview_url']).status_code == 422
    (folder / 'oriented.jpg').unlink()
    assert client.get(oriented['preview_url']).status_code == 404
    image.save(folder / 'oriented.jpg')
    with app.app_context():
        index_library()
    assert client.get(oriented['preview_url']).status_code == 409
    assert client.get('/photos/9999/preview').status_code == 404


def test_cli_index_and_serve_help(app):
    import subprocess
    import sys
    import os
    environment = dict(os.environ,PHOTO_DIR=app.config['PHOTO_DIR'],DATA_DIR=app.config['DATA_DIR'])
    result = subprocess.run([sys.executable,'app.py','index'],env=environment,capture_output=True,text=True)
    assert result.returncode == 0, result.stderr
    assert '"found": 7' in result.stdout
    help_result = subprocess.run([sys.executable,'app.py','serve','--help'],capture_output=True,text=True)
    assert '--port' in help_result.stdout


def test_concurrent_reservations_restart_and_sizes(app,client):
    from concurrent.futures import ThreadPoolExecutor
    from app import create_app, get_db
    setup_package(app,client)
    app.clock[0] = 1600
    clients = [enter(app.test_client(),f'Player {n}') for n in range(4)]
    def claim(c):
        response = post(c,'/api/packages',{'size':250})
        assert response.status_code == 200
        return response.json['package']
    with ThreadPoolExecutor(max_workers=4) as pool:
        packages = list(pool.map(claim,clients))
    claimed = [item['id'] for p in packages if p for item in p['items']]
    assert len(claimed) == len(set(claimed)) == 7
    restarted = create_app(dict(app.config))
    resumed = enter(restarted.test_client(),'Player '+str(next(i for i,p in enumerate(packages) if p)))
    assert resumed.get('/api/state').json['package']['total'] == 7
    with app.app_context():
        assert get_db().execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert get_db().execute('PRAGMA foreign_key_check').fetchall() == []


def test_bad_payloads_cookie_tampering_and_unicode_pin(app,client):
    with client.session_transaction() as s:
        s['csrf_token']='test-csrf'
    assert client.post('/enter',data={'pin':'ž','csrf_token':'test-csrf'}).status_code == 400
    enter(client,'Alice')
    assert client.post('/api/player',json={'username':'x'},headers={'X-CSRF-Token':'ž'}).status_code == 403
    for body in ({'package_id':{},'position':0},{'package_id':True,'position':0}):
        assert post(client,'/api/navigate',body).status_code == 400
    for body in ({'username':''},{'username':None},{'username':'x'*81}):
        assert post(client,'/api/player',body).status_code == 400
    assert client.get('/api/gallery?status=bad').status_code == 400
    assert client.get('/api/gallery?page=oops').status_code == 400
    client.set_cookie('session','forged-value')
    assert client.get('/api/state').status_code == 401


def test_decision_validation_and_atomic_batch_undo(app,client):
    package = setup_package(app,client)
    assert post(client,'/api/decision',dict(package_id=package['id'],photo_id={},version=0,value='liked',request_id=str(uuid4()))).status_code == 400
    package = vote(client,package).json['package']
    package = vote(client,package,package['items'][1],value='disliked').json['package']
    items = package['items'][:2]
    versions = {str(i['id']):i['version'] for i in items}
    invalid = dict(versions)
    invalid[str(items[1]['id'])] = -1
    data = dict(photo_ids=[i['id'] for i in items],versions=invalid,request_id=str(uuid4()))
    assert post(client,'/api/return',data).status_code == 409
    assert client.get('/api/state').json['counts']['liked'] == 1
    data.update(versions=versions,request_id=str(uuid4()))
    assert post(client,'/api/return',data).status_code == 200
    assert post(client,'/api/undo',{'request_id':str(uuid4())}).status_code == 200
    assert client.get('/api/state').json['counts']['liked'] == 1
    assert client.get('/api/state').json['counts']['disliked'] == 1


def test_real_wsgi_server_network(app):
    import subprocess
    import sys
    import os
    import socket
    import time
    import urllib.request
    import urllib.error
    environment = dict(os.environ,PHOTO_DIR=app.config['PHOTO_DIR'],DATA_DIR=app.config['DATA_DIR'])
    with socket.socket() as sock:
        sock.bind(('127.0.0.1',0))
        port = sock.getsockname()[1]
    process = subprocess.Popen([sys.executable,'app.py','serve','--port',str(port)],env=environment,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    try:
        for attempt in range(100):
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/enter',timeout=1) as response:
                    assert response.status == 200
                    assert 'csrf_token' in response.read().decode()
                break
            except urllib.error.URLError:
                assert process.poll() is None
                time.sleep(.05)
        else:
            raise AssertionError('Waitress did not start')
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{port}/api/state')
        except urllib.error.HTTPError as error:
            assert error.code == 401
        else:
            raise AssertionError('Network gate bypassed')
    finally:
        process.terminate()
        process.communicate(timeout=10)


def test_all_package_sizes_and_reserved_queue(app,client):
    from pathlib import Path
    from PIL import Image
    folder = Path(app.config['PHOTO_DIR']) / 'Hana Valdová/watermarked'
    for n in range(400):
        Image.new('RGB',(8,8),'green').save(folder/f'additional-{n:04}.jpg')
    with app.app_context():
        assert index_library()['found'] == 407
    clients = [enter(app.test_client(),f'Size {size} player {n}') for n,size in enumerate((50,100,250,50))]
    packages = [post(c,'/api/packages',{'size':size}).json['package'] for c,size in zip(clients,(50,100,250,50))]
    assert [p['total'] for p in packages] == [50,100,250,7]
    assert len({i['id'] for p in packages for i in p['items']}) == 407
    enter(client,'No work')
    assert post(client,'/api/packages',{'size':50}).json['package'] is None
    assert client.get('/api/state').json['counts']['assigned'] == 407


def test_csv_escape_duplicate_names_and_formula_safety(app,client):
    from pathlib import Path
    from PIL import Image
    import csv
    import io
    root = Path(app.config['PHOTO_DIR'])
    for folder in ('Hana Valdová/watermarked','Pepa Horák/watermarked'):
        Image.new('RGB',(8,8)).save(root/folder/'=duplicate,photo.jpg')
    package = setup_package(app,client)
    duplicates = [i for i in package['items'] if i['filename']=='=duplicate,photo.jpg']
    for item in duplicates:
        assert vote(client,package,item).status_code == 200
    rows = list(csv.DictReader(io.StringIO(client.get('/export.csv').text)))
    assert len(rows) == 2
    assert rows[0]['filename'] == "'=duplicate,photo.jpg"
    assert len({r['relative_path'] for r in rows}) == 2


def test_racing_expiry_and_save(app,client):
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    package = setup_package(app,client)
    package = vote(client,package).json['package']
    other = enter(app.test_client(),'Other')
    barrier = Barrier(2)
    app.clock[0] = 1600
    def late_vote():
        barrier.wait()
        return vote(client,package,package['items'][1])
    def allocate():
        barrier.wait()
        return post(other,'/api/packages',{'size':50})
    with ThreadPoolExecutor(max_workers=2) as pool:
        first,second = pool.submit(late_vote),pool.submit(allocate)
        rejected,allocated = first.result(),second.result()
    assert rejected.status_code == 409
    assert rejected.json['code'] == 'expired'
    assert allocated.status_code == 200
    assert allocated.json['package']['total'] == 6
    assert client.get('/api/state').json['counts']['liked'] == 1


def test_index_identity_allocation(app, client):
    with app.app_context():
        assert index_library()['total'] == 7
        assert index_library()['total'] == 7
    enter(client, '  Alice  ')
    alice = client.get('/api/state').json['player']
    enter(client, 'ALICE')
    assert client.get('/api/state').json['player'] == alice
    assert len(client.get('/api/players?q=ali').json['players']) == 1
    package = post(client, '/api/packages', {'size': 50}).json['package']
    assert len(package['items']) == 7
    assert package['answered'] == 0
    assert post(client, '/api/packages', {'size': 100}).json['package']['id'] == package['id']
    other = enter(app.test_client(), 'Bob')
    assert post(other, '/api/packages', {'size': 50}).json['package'] is None
    assert client.get('/api/state').json['counts'] == {'pending': 0, 'assigned': 7, 'liked': 0, 'disliked': 0, 'total': 7}
    assert post(client, '/api/packages', {'size': 2}).status_code == 400



def test_gate_and_csrf(client):
    for path in ['/api/state', '/api/players', '/api/gallery', '/photos/1/preview', '/export.csv', '/api/packages/1', '/api/photos/1/history']:
        assert client.get(path).status_code == 401
    assert client.get('/').status_code == 302
    with client.session_transaction() as s:
        s['csrf_token'] = 'test-csrf'
    assert client.post('/enter', data={'pin': 'bad', 'csrf_token': 'test-csrf'}).status_code == 400
    assert client.get('/api/state').status_code == 401
    enter(client)
    assert client.post('/api/player', json={'username': 'A'}).status_code == 403
    assert client.get('/api/state').json['player'] is None
