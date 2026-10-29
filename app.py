"""Shared event-day photo review. Originals are read-only; all writes use DATA_DIR."""
import argparse
import csv
import io
import json
import os
from pathlib import Path
import secrets
import sqlite3
import time
import unicodedata
from uuid import UUID

from flask import Flask, g, jsonify, redirect, render_template, request, send_file, session
from jinja2 import TemplateNotFound
from messages import language, translate

SOURCE_ALLOWLIST = ('Hana Valdová/watermarked', 'Pepa Horák/watermarked')
DEFAULT_PHOTOS = 'D:/Cloud/OneDrive - Š&P Outdoor/Media/Fotky/Fotky Trail Maniacs/2026'


class APIError(Exception):
    def __init__(self, message, code='invalid', status=400):
        self.message, self.code, self.status = message, code, status


def create_app(config=None):
    app = Flask(__name__)
    app.config.update(PHOTO_DIR=os.environ.get('PHOTO_DIR', DEFAULT_PHOTOS if os.name == 'nt' else '/srv/photo-grindr/photos'), DATA_DIR=os.environ.get('DATA_DIR', str(Path(__file__).parent / 'data') if os.name == 'nt' else '/var/lib/photo-grindr'), NOW=time.time, SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax', MAX_CONTENT_LENGTH=65536)
    app.config.update(config or {})
    data = Path(app.config['DATA_DIR'])
    data.mkdir(parents=True, exist_ok=True)
    if not app.config.get('SECRET_KEY'):
        secret = data / 'secret.key'
        try:
            with secret.open('x') as f:
                f.write(secrets.token_hex(32))
        except FileExistsError:
            pass
        app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or secret.read_text().strip()
    app.config['DATABASE'] = str(data / 'review.sqlite3')

    @app.before_request
    def protect():
        session.setdefault('csrf_token', secrets.token_urlsafe(32))
        if request.path.startswith('/static/'):
            return None
        if request.path != '/enter' and not session.get('entered'):
            return redirect('/enter') if request.path == '/' else (jsonify(error=translate('Enter the shared PIN first.'), code='gate'), 401)
        if request.method == 'POST':
            token = request.form.get('csrf_token') if request.path == '/enter' else request.headers.get('X-CSRF-Token')
            if not token or not secrets.compare_digest(token.encode('utf-8'), session['csrf_token'].encode('utf-8')):
                raise APIError('Invalid CSRF token.', 'csrf', 403)
        if request.path != '/enter':
            with transaction():
                pass

    @app.errorhandler(APIError)
    def api_error(error):
        return jsonify(error=translate(error.message), code=error.code), error.status

    @app.teardown_appcontext
    def close_db(_error):
        db = g.pop('db', None)
        if db is not None:
            db.close()

    def page(template, **kwargs):
        try:
            return render_template(template, csrf_token=session['csrf_token'], lang=language(), **kwargs)
        except TemplateNotFound:
            if not app.testing:
                raise
            return kwargs.get('error', '')

    @app.route('/enter', methods=['GET', 'POST'])
    def entry():
        if request.method == 'POST':
            attempts = app.extensions.setdefault('pin_attempts', {})
            key = request.remote_addr
            attempts[key] = [t for t in attempts.get(key, []) if now() - t < 60]
            if len(attempts[key]) >= 10:
                raise APIError('Too many attempts; wait one minute.', 'throttled', 429)
            if not secrets.compare_digest(request.form.get('pin', '').encode('utf-8'), b'2026'):
                attempts[key].append(now())
                return page('enter.html', error=translate('Incorrect PIN.')), 400
            session['entered'] = True
            return redirect('/')
        return page('enter.html', error='')

    @app.get('/')
    def home():
        return page('index.html', error='')

    @app.get('/api/state')
    def state_route():
        return jsonify(state())

    @app.get('/api/players')
    def players():
        query = normalize(request.args.get('q', ''))
        rows = get_db().execute('SELECT id,username,username_key FROM players ORDER BY username_key').fetchall()
        import difflib
        matches = [dict(id=r['id'], username=r['username']) for r in rows if not query or query in r['username_key'] or difflib.SequenceMatcher(None, query, r['username_key']).ratio() >= .55]
        return jsonify(players=matches[:100])

    @app.post('/api/player')
    def select_player():
        name = payload().get('username')
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80 or any(ord(c) < 32 for c in name):
            raise APIError('Enter a player name (1–80 characters).')
        name = name.strip()
        with transaction() as db:
            db.execute('INSERT OR IGNORE INTO players(username,username_key,last_action) VALUES(?,?,?)', (name, normalize(name), now()))
            row = db.execute('SELECT id FROM players WHERE username_key=?', (normalize(name),)).fetchone()
        session['player_id'] = row['id']
        return jsonify(state())

    @app.post('/api/packages')
    def allocate():
        size = payload().get('size')
        if type(size) is not int or size not in (50, 100, 250):
            raise APIError('Choose 50, 100, or 250 photos.')
        pid = player_id()
        with transaction() as db:
            current = db.execute("SELECT id FROM packages WHERE player_id=? AND status='active'", (pid,)).fetchone()
            if current:
                package_id = current['id']
            else:
                photos = db.execute("SELECT id,round FROM photos WHERE state='pending' AND assigned_package IS NULL AND availability='available' ORDER BY returned DESC,filename,relative_path LIMIT ?", (size,)).fetchall()
                package_id = None
                if photos:
                    package_id = db.execute("INSERT INTO packages(player_id,status,position,created_at) VALUES(?,'active',0,?)", (pid,now())).lastrowid
                    for position, photo in enumerate(photos):
                        db.execute('INSERT INTO package_items(package_id,photo_id,round,position) VALUES(?,?,?,?)', (package_id,photo['id'],photo['round'],position))
                        db.execute('UPDATE photos SET assigned_package=?,version=version+1 WHERE id=?', (package_id,photo['id']))
            db.execute('UPDATE players SET last_action=? WHERE id=?', (now(),pid))
        return jsonify(package=package_obj(package_id))

    @app.get('/api/packages/<int:package_id>')
    def get_package(package_id):
        package = package_obj(package_id)
        if not package:
            raise APIError('Package not found.', 'not_found', 404)
        if get_db().execute('SELECT player_id FROM packages WHERE id=?', (package_id,)).fetchone()[0] != player_id():
            raise APIError('This package belongs to another player.', 'conflict', 409)
        if package['status']=='expired':
            raise APIError('Your package expired after 10 minutes. Choose a new package.', 'expired',409)
        return jsonify(package=package)

    @app.post('/api/activity')
    def activity():
        with transaction():
            touch()
        return jsonify(ok=True)

    @app.post('/api/navigate')
    def navigate():
        body = payload()
        with transaction() as db:
            package = owned_package(body.get('package_id'))
            position = body.get('position')
            count = db.execute('SELECT COUNT(*) FROM package_items WHERE package_id=?', (package['id'],)).fetchone()[0]
            if type(position) is not int or not 0 <= position < count:
                raise APIError('Invalid photo position.')
            db.execute('UPDATE packages SET position=? WHERE id=?', (position,package['id']))
            touch()
        return jsonify(package=package_obj(package['id']))

    @app.post('/api/decision')
    def decision():
        body = payload()
        if body.get('value') not in ('liked', 'disliked'):
            raise APIError('Choose liked or disliked.')
        if type(body.get('photo_id')) is not int or not 1 <= body['photo_id'] <= 9223372036854775807 or type(body.get('version')) is not int or body['version'] < 0:
            raise APIError('Invalid photo ID or version.')
        with transaction() as db:
            replay = replay_request('decision', body)
            if replay is not None:
                return jsonify(replay)
            package = owned_package(body.get('package_id'))
            photo = db.execute('SELECT p.*,i.round AS item_round,i.position AS item_position FROM photos p JOIN package_items i ON i.photo_id=p.id WHERE p.id=? AND i.package_id=?', (body.get('photo_id'),package['id'])).fetchone()
            if not photo or photo['assigned_package'] != package['id'] or photo['round'] != photo['item_round'] or photo['version'] != body.get('version'):
                raise APIError('Photo changed; refresh before saving.', 'conflict', 409)
            before = dict(photo)
            db.execute('UPDATE photos SET state=?,judged_by=?,version=version+1 WHERE id=?', (body['value'],player_id(),photo['id']))
            db.execute('UPDATE package_items SET decision=? WHERE package_id=? AND photo_id=?', (body['value'],package['id'],photo['id']))
            add_event(photo['id'],body['value'],before,photo['version']+1,package['id'])
            unanswered = db.execute('SELECT COUNT(*) FROM package_items WHERE package_id=? AND decision IS NULL', (package['id'],)).fetchone()[0]
            db.execute('UPDATE packages SET status=?,position=? WHERE id=?', ('active' if unanswered else 'complete',min(photo['item_position']+1,package_obj(package['id'])['total']-1),package['id']))
            touch()
            response = dict(package=package_obj(package['id']),complete=not unanswered)
            remember_request('decision',body,response)
        return jsonify(response)

    @app.post('/api/return')
    def return_photos():
        body = payload()
        ids, versions = body.get('photo_ids'), body.get('versions')
        if not isinstance(ids,list) or not ids or len(ids)>250 or any(type(i) is not int for i in ids) or len(set(ids))!=len(ids) or not isinstance(versions,dict):
            raise APIError('Choose 1–250 distinct photo IDs and their versions.')
        with transaction() as db:
            replay = replay_request('return',body)
            if replay is not None:
                return jsonify(replay)
            touch()
            for photo_id in ids:
                photo = db.execute('SELECT * FROM photos WHERE id=?',(photo_id,)).fetchone()
                if not photo or photo['state']=='pending' or photo['version'] != versions.get(str(photo_id)):
                    raise APIError('A selected photo changed; refresh the gallery.', 'conflict',409)
                db.execute("UPDATE photos SET state='pending',round=round+1,version=version+1,returned=1,assigned_package=NULL,judged_by=NULL WHERE id=?", (photo_id,))
                add_event(photo_id,'returned',dict(photo),photo['version']+1)
            response = dict(ok=True)
            remember_request('return',body,response)
        return jsonify(response)

    @app.post('/api/undo')
    def undo():
        body = payload()
        with transaction() as db:
            replay = replay_request('undo',body)
            if replay is not None:
                return jsonify(replay)
            touch()
            event = db.execute("SELECT * FROM events WHERE actor_id=? AND action IN ('liked','disliked','returned') AND undone=0 ORDER BY id DESC LIMIT 1", (player_id(),)).fetchone()
            if not event:
                raise APIError('Nothing remains to undo.', 'conflict',409)
            events = db.execute('SELECT * FROM events WHERE operation_id=? AND undone=0 ORDER BY id DESC', (event['operation_id'],)).fetchall()
            package_id = None
            for event in events:
                photo = db.execute('SELECT * FROM photos WHERE id=?',(event['photo_id'],)).fetchone()
                if photo['version'] != event['after_version']:
                    raise APIError('A later action depends on this photo; undo is unsafe.', 'conflict',409)
                before = json.loads(event['before_state'])
                if event['action'] in ('liked','disliked'):
                    package = owned_package(event['package_id'])
                    active = db.execute("SELECT id FROM packages WHERE player_id=? AND status='active' AND id<>?", (player_id(),package['id'])).fetchone()
                    if active:
                        raise APIError('Finish your current package before undoing an older one.', 'conflict',409)
                    db.execute('UPDATE package_items SET decision=? WHERE package_id=? AND photo_id=?', (None if before['state']=='pending' else before['state'],package['id'],photo['id']))
                    position = db.execute('SELECT position FROM package_items WHERE package_id=? AND photo_id=?',(package['id'],photo['id'])).fetchone()[0]
                    db.execute("UPDATE packages SET status='active',position=? WHERE id=?", (position,package['id']))
                    package_id = package['id']
                db.execute('UPDATE photos SET state=?,round=?,returned=?,assigned_package=?,judged_by=?,version=version+1 WHERE id=?',(before['state'],before['round'],before['returned'],before['assigned_package'],before['judged_by'],photo['id']))
                db.execute('UPDATE events SET undone=1 WHERE id=?',(event['id'],))
                add_event(photo['id'],'undo',dict(photo),photo['version']+1,package_id)
            response = dict(package=package_obj(package_id))
            remember_request('undo',body,response)
        return jsonify(response)

    @app.get('/api/gallery')
    def gallery():
        status = request.args.get('status', 'liked')
        if status not in ('liked','disliked'):
            raise APIError('Invalid gallery status.')
        try:
            page_number = max(1,int(request.args.get('page',1)))
        except ValueError:
            raise APIError('Invalid page.')
        db = get_db()
        total = db.execute('SELECT COUNT(*) FROM photos WHERE state=?',(status,)).fetchone()[0]
        pages = max(1,(total+49)//50)
        page_number = min(page_number,pages)
        rows = db.execute('SELECT p.*,u.username FROM photos p LEFT JOIN players u ON u.id=p.judged_by WHERE p.state=? ORDER BY p.filename,p.relative_path LIMIT 50 OFFSET ?', (status,(page_number-1)*50)).fetchall()
        return jsonify(items=[dict(photo_obj(r),judged_by=r['username']) for r in rows],page=page_number,pages=pages,total=total)

    @app.get('/api/photos/<int:photo_id>/history')
    def history(photo_id):
        rows = get_db().execute('SELECT e.action,e.created_at,p.username AS actor FROM events e LEFT JOIN players p ON p.id=e.actor_id WHERE photo_id=? ORDER BY e.id', (photo_id,)).fetchall()
        from datetime import datetime, timezone
        return jsonify(events=[dict(actor=r['actor'],action=r['action'],created_at=datetime.fromtimestamp(r['created_at'],timezone.utc).isoformat()) for r in rows])

    @app.get('/photos/<int:photo_id>/preview')
    def preview(photo_id):
        from PIL import Image, ImageOps, UnidentifiedImageError
        import tempfile
        photo = get_db().execute('SELECT * FROM photos WHERE id=?',(photo_id,)).fetchone()
        if not photo:
            raise APIError('Photo not found.', 'not_found',404)
        root = Path(app.config['PHOTO_DIR']).resolve()
        relative = Path(photo['relative_path'])
        source = (root / relative).resolve()
        approved = any(relative.as_posix().startswith(folder+'/') for folder in SOURCE_ALLOWLIST)
        if not approved or not source.is_relative_to(root):
            raise APIError('Photo path is outside the approved library.', 'forbidden',403)
        try:
            stat = source.stat()
        except OSError:
            raise APIError('Source photo is unavailable.', 'missing',404)
        if photo['availability']=='replaced' or stat.st_size!=photo['size_bytes'] or stat.st_mtime_ns!=photo['mtime_ns']:
            raise APIError('Source file changed; administrator review required.', 'conflict',409)
        cache = Path(app.config['DATA_DIR']) / 'previews'
        cache.mkdir(exist_ok=True)
        target = cache / f"{photo_id}-{photo['mtime_ns']}-{photo['size_bytes']}.jpg"
        if not target.exists():
            temporary = None
            try:
                with Image.open(source) as image:
                    image = ImageOps.exif_transpose(image)
                    image.thumbnail((1600,1600))
                    with tempfile.NamedTemporaryFile(dir=cache,suffix='.jpg',delete=False) as f:
                        temporary = Path(f.name)
                    image.convert('RGB').save(temporary,'JPEG',quality=85)
                    os.replace(temporary,target)
            except (OSError, ValueError, UnidentifiedImageError, Image.DecompressionBombError):
                raise APIError('Photo cannot be decoded; no decision was saved.', 'corrupt',422)
            finally:
                if temporary:
                    temporary.unlink(missing_ok=True)
        response = send_file(target,mimetype='image/jpeg',conditional=True,max_age=0)
        response.headers['Cache-Control'] = 'private, no-cache'
        return response

    @app.get('/export.csv')
    def export_csv():
        with transaction():
            touch()
            rows = get_db().execute("SELECT filename,relative_path FROM photos WHERE state='liked' ORDER BY filename,relative_path").fetchall()
        output = io.StringIO(newline='')
        writer = csv.writer(output)
        writer.writerow(['filename','relative_path'])
        for row in rows:
            writer.writerow([("'"+v) if v.lstrip().startswith(('=','+','-','@','\t','\r')) else v for v in row])
        return app.response_class(output.getvalue(),mimetype='text/csv',headers={'Content-Disposition':'attachment; filename="liked-photos.csv"'})

    with app.app_context():
        db = get_db()
        db.executescript(SCHEMA)
    return app


def now():
    from flask import current_app
    return current_app.config['NOW']()


def get_db():
    from flask import current_app
    if 'db' not in g:
        g.db = sqlite3.connect(current_app.config['DATABASE'], timeout=30, isolation_level=None)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA foreign_keys=ON')
        g.db.execute('PRAGMA journal_mode=WAL')
    return g.db


SCHEMA = '''
CREATE TABLE IF NOT EXISTS players(id INTEGER PRIMARY KEY,username TEXT NOT NULL,username_key TEXT UNIQUE NOT NULL,last_action REAL NOT NULL);
CREATE TABLE IF NOT EXISTS packages(id INTEGER PRIMARY KEY,player_id INTEGER NOT NULL REFERENCES players(id),status TEXT NOT NULL,position INTEGER NOT NULL,created_at REAL NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_package ON packages(player_id) WHERE status='active';
CREATE TABLE IF NOT EXISTS photos(id INTEGER PRIMARY KEY,relative_path TEXT UNIQUE NOT NULL,filename TEXT NOT NULL,size_bytes INTEGER NOT NULL,mtime_ns INTEGER NOT NULL,availability TEXT NOT NULL DEFAULT 'available',state TEXT NOT NULL DEFAULT 'pending',round INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 0,returned INTEGER NOT NULL DEFAULT 0,assigned_package INTEGER REFERENCES packages(id),judged_by INTEGER REFERENCES players(id));
CREATE TABLE IF NOT EXISTS package_items(package_id INTEGER REFERENCES packages(id),photo_id INTEGER REFERENCES photos(id),round INTEGER NOT NULL,position INTEGER NOT NULL,decision TEXT,PRIMARY KEY(package_id,photo_id));
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,photo_id INTEGER REFERENCES photos(id),actor_id INTEGER REFERENCES players(id),action TEXT NOT NULL,created_at REAL NOT NULL,before_state TEXT,after_version INTEGER,package_id INTEGER REFERENCES packages(id),operation_id TEXT,undone INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS requests(request_id TEXT PRIMARY KEY,actor_id INTEGER REFERENCES players(id),kind TEXT NOT NULL,payload TEXT NOT NULL,response TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS photo_queue ON photos(state,assigned_package,returned);
CREATE INDEX IF NOT EXISTS event_photo ON events(photo_id,id);
'''

from contextlib import contextmanager


@contextmanager
def transaction():
    db = get_db()
    db.execute('BEGIN IMMEDIATE')
    expire_packages(db)
    db.execute('SAVEPOINT operation')
    try:
        yield db
        db.commit()
    except BaseException:
        db.execute('ROLLBACK TO operation')
        db.commit()
        raise


def expire_packages(db):
    rows = db.execute("SELECT k.id,k.player_id FROM packages k JOIN players p ON p.id=k.player_id WHERE k.status='active' AND p.last_action<=?", (now()-600,)).fetchall()
    for row in rows:
        photos = db.execute("SELECT * FROM photos WHERE assigned_package=? AND state='pending'", (row['id'],)).fetchall()
        for photo in photos:
            db.execute('INSERT INTO events(photo_id,actor_id,action,created_at,before_state,after_version,package_id) VALUES(?,?,\'released\',?,?,?,?)', (photo['id'],row['player_id'],now(),json.dumps(dict(photo)),photo['version']+1,row['id']))
        db.execute("UPDATE photos SET assigned_package=NULL,version=version+1 WHERE assigned_package=? AND state='pending'", (row['id'],))
        db.execute("UPDATE packages SET status='expired' WHERE id=?", (row['id'],))


def payload():
    value = request.get_json(silent=True)
    if not isinstance(value, dict):
        raise APIError('Expected a JSON object.')
    return value


def normalize(name):
    return unicodedata.normalize('NFKC', name.strip()).casefold()


def player_id():
    value = session.get('player_id')
    if not value or not get_db().execute('SELECT 1 FROM players WHERE id=?', (value,)).fetchone():
        raise APIError('Select a player first.', 'player_required', 400)
    return value


def photo_obj(row):
    return dict(id=row['id'],filename=row['filename'],relative_path=row['relative_path'],decision=None if row['state']=='pending' else row['state'],version=row['version'],preview_url=f"/photos/{row['id']}/preview")


def package_obj(package_id):
    if not package_id:
        return None
    db = get_db()
    package = db.execute('SELECT * FROM packages WHERE id=?', (package_id,)).fetchone()
    if not package:
        return None
    rows = db.execute('SELECT p.*,i.decision AS item_decision FROM package_items i JOIN photos p ON p.id=i.photo_id WHERE i.package_id=? ORDER BY i.position', (package_id,)).fetchall()
    items = [dict(photo_obj(r),decision=r['item_decision']) for r in rows]
    return dict(id=package_id,status=package['status'],position=package['position'],answered=sum(i['decision'] is not None for i in items),total=len(items),items=items)


def state():
    db = get_db()
    counts = dict(pending=0,assigned=0,liked=0,disliked=0,total=0)
    for row in db.execute('SELECT state,assigned_package,COUNT(*) AS n FROM photos GROUP BY state,assigned_package'):
        counts['total'] += row['n']
        key = 'assigned' if row['state']=='pending' and row['assigned_package'] else row['state']
        counts[key] += row['n']
    pid = session.get('player_id')
    row = db.execute('SELECT id,username FROM players WHERE id=?', (pid,)).fetchone()
    package = db.execute("SELECT id,status FROM packages WHERE player_id=? ORDER BY id DESC LIMIT 1", (pid,)).fetchone()
    return dict(player=dict(row) if row else None,counts=counts,package=package_obj(package['id']) if package and package['status']=='active' else None,expired=bool(package and package['status']=='expired'),expired_package_id=package['id'] if package and package['status']=='expired' else None)


def owned_package(package_id):
    if type(package_id) is not int or package_id < 1:
        raise APIError('Invalid package ID.')
    row = get_db().execute('SELECT * FROM packages WHERE id=? AND player_id=?', (package_id,player_id())).fetchone()
    if not row or row['status'] not in ('active','complete'):
        raise APIError('Package is no longer available.', 'expired' if row and row['status']=='expired' else 'conflict',409)
    return row


def touch():
    # Expiry protects assignments, not a player's unrelated browsing/export activity.
    # owned_package() still rejects all operations targeting an expired package.
    get_db().execute('UPDATE players SET last_action=? WHERE id=?', (now(),player_id()))


def replay_request(kind, body):
    request_id = body.get('request_id')
    try:
        UUID(request_id)
    except (ValueError, TypeError, AttributeError):
        raise APIError('A UUID request_id is required.')
    row = get_db().execute('SELECT * FROM requests WHERE request_id=?', (request_id,)).fetchone()
    if row:
        if row['actor_id'] != player_id() or row['kind'] != kind or row['payload'] != json.dumps(body,sort_keys=True):
            raise APIError('Request ID was already used for a different operation.', 'conflict',409)
        return json.loads(row['response'])
    return None


def remember_request(kind, body, response):
    get_db().execute('INSERT INTO requests VALUES(?,?,?,?,?)', (body['request_id'],player_id(),kind,json.dumps(body,sort_keys=True),json.dumps(response)))


def add_event(photo_id, action, before, after_version, package_id=None):
    get_db().execute('INSERT INTO events(photo_id,actor_id,action,created_at,before_state,after_version,package_id,operation_id) VALUES(?,?,?,?,?,?,?,?)', (photo_id,player_id(),action,now(),json.dumps(before),after_version,package_id,payload().get('request_id')))


def index_library():
    from flask import current_app
    root = Path(current_app.config['PHOTO_DIR']).resolve()
    found = []
    for folder in SOURCE_ALLOWLIST:
        directory = root / folder
        if not directory.is_dir():
            continue
        for path in directory.rglob('*'):
            if path.suffix.lower() not in ('.jpg', '.jpeg') or not path.is_file():
                continue
            if not path.resolve().is_relative_to(directory.resolve()) or not path.resolve().is_relative_to(root):
                continue
            stat = path.stat()
            found.append((path.relative_to(root).as_posix(),path.name,stat.st_size,stat.st_mtime_ns))
    with transaction() as db:
        db.execute("UPDATE photos SET availability='missing'")
        for relative, filename, size, mtime in found:
            existing = db.execute('SELECT * FROM photos WHERE relative_path=?', (relative,)).fetchone()
            if not existing:
                db.execute('INSERT INTO photos(relative_path,filename,size_bytes,mtime_ns) VALUES(?,?,?,?)', (relative,filename,size,mtime))
            else:
                status = 'available' if existing['size_bytes']==size and existing['mtime_ns']==mtime else 'replaced'
                db.execute('UPDATE photos SET availability=? WHERE id=?', (status,existing['id']))
        total = db.execute('SELECT COUNT(*) FROM photos').fetchone()[0]
    return dict(total=total,found=len(found),available=get_db().execute("SELECT COUNT(*) FROM photos WHERE availability='available'").fetchone()[0])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command',required=True)
    commands.add_parser('index',help='Metadata-only index of the two approved watermarked folders.')
    server = commands.add_parser('serve',help='Run the Waitress WSGI server (localhost by default).')
    server.add_argument('--host',default='127.0.0.1')
    server.add_argument('--port',type=int,default=5000)
    args = parser.parse_args()
    app = create_app()
    if args.command=='index':
        started = time.perf_counter()
        with app.app_context():
            result = index_library()
        result['seconds'] = round(time.perf_counter()-started,3)
        print(json.dumps(result,ensure_ascii=True))
    else:
        from waitress import serve
        serve(app,host=args.host,port=args.port,threads=8)


if __name__=='__main__':
    main()
