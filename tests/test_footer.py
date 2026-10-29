import pytest
from conftest import enter


@pytest.mark.parametrize('lang', ['cs', 'en'])
def test_entry_and_app_footer_show_copyright_and_repository(client, lang):
    client.set_cookie('lang', lang)
    pages = [client.get('/enter')]
    enter(client)
    pages.append(client.get('/'))
    for page in pages:
        assert page.status_code == 200
        assert '© 2026 Š&amp;P Outdoor z.s.' in page.text
        assert 'href="https://github.com/sap-outdoor/photo-grindr"' in page.text
        assert 'rel="noopener noreferrer"' in page.text
        assert '>GitHub</a>' in page.text
