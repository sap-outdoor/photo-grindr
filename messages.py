"""User-facing server messages. Protocol fields and CSV columns stay stable."""
from flask import request

CS = {
    'Enter the shared PIN first.': 'Nejprve zadejte společný PIN.',
    'Invalid CSRF token.': 'Ověření požadavku vypršelo. Obnovte stránku a zkuste to znovu.',
    'Too many attempts; wait one minute.': 'Příliš mnoho pokusů. Počkejte jednu minutu.',
    'Incorrect PIN.': 'Nesprávný PIN.',
    'Enter a player name (1–80 characters).': 'Zadejte jméno hráče (1–80 znaků).',
    'Choose 50, 100, or 250 photos.': 'Vyberte 50, 100 nebo 250 fotek.',
    'Package not found.': 'Balíček nebyl nalezen.',
    'This package belongs to another player.': 'Tento balíček patří jinému hráči.',
    'Your package expired after 10 minutes. Choose a new package.': 'Platnost balíčku po 10 minutách vypršela. Vyberte si nový balíček.',
    'Invalid photo position.': 'Neplatná pozice fotky.',
    'Choose liked or disliked.': 'Vyberte, zda fotku chcete ponechat, nebo zamítnout.',
    'Invalid photo ID or version.': 'Neplatné ID nebo verze fotky.',
    'Photo changed; refresh before saving.': 'Fotka se mezitím změnila. Před uložením obnovte zobrazení.',
    'Choose 1–250 distinct photo IDs and their versions.': 'Vyberte 1–250 různých fotek s jejich aktuálními verzemi.',
    'A selected photo changed; refresh the gallery.': 'Některá vybraná fotka se změnila. Obnovte galerii.',
    'Nothing remains to undo.': 'Není co vrátit zpět.',
    'A later action depends on this photo; undo is unsafe.': 'Na tuto fotku navazuje novější akce. Rozhodnutí už nelze bezpečně vrátit.',
    'Finish your current package before undoing an older one.': 'Před vrácením rozhodnutí ze staršího balíčku dokončete aktuální balíček.',
    'Invalid gallery status.': 'Neplatný filtr galerie.',
    'Invalid page.': 'Neplatné číslo stránky.',
    'Photo not found.': 'Fotka nebyla nalezena.',
    'Photo path is outside the approved library.': 'Cesta k fotce je mimo povolenou knihovnu.',
    'Source photo is unavailable.': 'Zdrojová fotka není dostupná.',
    'Source file changed; administrator review required.': 'Zdrojový soubor se změnil. Je nutná kontrola správce.',
    'Photo cannot be decoded; no decision was saved.': 'Fotku nelze načíst. Žádné rozhodnutí nebylo uloženo.',
    'Expected a JSON object.': 'Požadavek musí obsahovat objekt JSON.',
    'Select a player first.': 'Nejprve vyberte hráče.',
    'Invalid package ID.': 'Neplatné ID balíčku.',
    'Package is no longer available.': 'Balíček už není dostupný.',
    'A UUID request_id is required.': 'Požadavek musí obsahovat platný identifikátor UUID.',
    'Request ID was already used for a different operation.': 'Identifikátor požadavku už byl použit pro jinou operaci.',
}


def language():
    return 'en' if request.cookies.get('lang') == 'en' else 'cs'


def translate(message):
    return message if language() == 'en' else CS.get(message, message)
