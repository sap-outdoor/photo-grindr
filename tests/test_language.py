from conftest import enter, post


def test_errors_default_to_czech(app, client):
    response = client.get('/api/state')
    assert response.status_code == 401
    assert response.json['error'] == 'Nejprve zadejte společný PIN.'
    assert response.json['code'] == 'gate'


def test_english_cookie_and_invalid_language(app, client):
    client.set_cookie('lang', 'en')
    assert client.get('/api/state').json['error'] == 'Enter the shared PIN first.'
    client.set_cookie('lang', 'invalid')
    assert client.get('/api/state').json['error'] == 'Nejprve zadejte společný PIN.'


def test_czech_pin_error_and_english_pin_error(app, client):
    client.get('/enter')
    with client.session_transaction() as state:
        token = state['csrf_token']
    bad = client.post('/enter', data={'pin':'wrong','csrf_token':token})
    assert bad.status_code == 400
    assert 'Nesprávný PIN.' in bad.text
    client.set_cookie('lang', 'en')
    bad = client.post('/enter', data={'pin':'wrong','csrf_token':token})
    assert 'Incorrect PIN.' in bad.text


def test_authenticated_validation_translated_without_changing_codes(app, client):
    enter(client)
    result = post(client, '/api/packages', {'size': 3})
    assert result.status_code == 400
    assert result.json['error'] == 'Vyberte 50, 100 nebo 250 fotek.'
    client.set_cookie('lang', 'en')
    result = post(client, '/api/packages', {'size':3})
    assert result.json['error'] == 'Choose 50, 100, or 250 photos.'
