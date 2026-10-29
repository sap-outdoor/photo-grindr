'use strict';
// Local-only language selection. Never reload: pending Undo request IDs stay in memory.
const PhotoI18n = (() => {
  const messages = {
  "Photo Grindr · The shared photo desk": "Photo Grindr · Společný výběr fotek",
  "Photo Grindr home": "Photo Grindr – domů",
  "Main navigation": "Hlavní navigace",
  "Operate": "Třídit",
  "Explore": "Prohlížet",
  "Connecting…": "Připojování…",
  "JavaScript is needed to review photos. Enable it and reload this page.": "K třídění fotek je potřeba JavaScript. Zapněte ho a obnovte stránku.",
  "Working… please wait": "Pracuji… prosím počkejte",
  "THE SHARED PHOTO DESK": "SPOLEČNÝ VÝBĚR FOTEK",
  "Find the": "Najděte ty",
  "keepers.": "nejlepší.",
  "A little focus. A fresh pair of eyes. Make the next selection count.": "Chvilka soustředění a nový pohled. Vyberte fotky, které stojí za to.",
  "LOOK.": "DÍVEJTE SE.",
  "CHOOSE.": "VYBÍREJTE.",
  "REPEAT. ↗": "POKRAČUJTE. ↗",
  "01 / THE BIG PICTURE": "01 / CELKOVÝ PŘEHLED",
  "One library. Everyone's progress.": "Jedna knihovna. Společný pokrok.",
  "Shared photo counts": "Počty fotek ve společné knihovně",
  "Awaiting review": "Čeká na výběr",
  "Ready for a fresh pair of eyes": "Připraveno na nový pohled",
  "In progress": "Právě se třídí",
  "Reserved in active packages": "Rezervováno v aktivních balíčcích",
  "Liked": "Líbí se",
  "Disliked": "Nelíbí se",
  "Explore the shared keepers": "Prohlédnout vybrané fotky",
  "Worth another look?": "Zaslouží si druhý pohled?",
  "02 / YOUR NEXT ROUND": "02 / DALŠÍ KOLO",
  "AT THE DESK": "U VÝBĚRU",
  "Choose your player": "Vyberte hráče",
  "Switch player": "Změnit hráče",
  "Your player name": "Jméno hráče",
  "Find or create your player": "Najděte nebo vytvořte hráče",
  "Continue →": "Pokračovat →",
  "Loading known players…": "Načítání hráčů…",
  "Known and similar players": "Známí a podobní hráči",
  "Names are for shared attribution, not private accounts. Similar suggestions are never merged automatically.": "Jména slouží k označení autorů výběru, nejde o soukromé účty. Podobná jména se nikdy automaticky neslučují.",
  "Pick up where you left off": "Pokračujte tam, kde jste skončili",
  "Resume review →": "Pokračovat ve výběru →",
  "Choose your pace": "Zvolte si tempo",
  "/ photos per package": "/ fotek v balíčku",
  "A quick round": "Rychlé kolo",
  "Find your flow": "Chyťte rytmus",
  "Settle in": "Pořádný výběr",
  "A SIMPLE RHYTHM": "JEDNODUCHÝ RYTMUS",
  "Less sorting.": "Méně třídění.",
  "More seeing.": "Více zážitků.",
  "Take a package": "Vezměte si balíček",
  "A reserved slice of the shared library. Resume it any time.": "Rezervovaná část společné knihovny. Můžete se k ní vrátit.",
  "Trust your eye": "Věřte svému oku",
  "Swipe or press Like / Dislike. Use the edges to navigate without deciding.": "Přejeďte prstem nebo zvolte Líbí se / Nelíbí se. Klepnutím na okraje listujete bez rozhodnutí.",
  "Make room for a second look": "Dejte fotkám druhou šanci",
  "Explore anyone's selections. Send a photo back when it deserves another review.": "Prohlédněte si společný výběr. Fotku můžete vrátit k novému posouzení.",
  "After": "Po",
  "10 minutes without an operation": "10 minutách bez aktivity",
  "— unanswered photos return to the queue. Saved decisions stay saved.": "se nerozhodnuté fotky vrátí do fronty. Uložená rozhodnutí zůstávají.",
  "photos in the shared library": "fotek ve společné knihovně",
  "Export shared likes · CSV": "Export oblíbených · CSV",
  "Export shared likes · CSV ↗": "Export oblíbených · CSV ↗",
  "Review photos": "Výběr fotek",
  "← Home": "← Domů",
  "Reviewing as": "Vybírá",
  "↶ Undo": "↶ Zpět",
  "ONE FRAME AT A TIME": "JEDNA FOTKA ZA DRUHOU",
  "Photo": "Fotka",
  "Saved package decisions": "Uložená rozhodnutí v balíčku",
  "Photo: swipe left to dislike, right to like. Tap edges to navigate.": "Fotka: přejetím doleva se nelíbí, doprava se líbí. Klepnutím na okraje listujete.",
  "This preview couldn't load.": "Náhled se nepodařilo načíst.",
  "Your decision has not changed. Retry, or navigate to another photo.": "Vaše rozhodnutí se nezměnilo. Zkuste náhled načíst znovu nebo přejděte na další fotku.",
  "Retry preview": "Zkusit znovu načíst",
  "Awaiting your decision": "Čeká na vaše rozhodnutí",
  "Previous photo": "Předchozí fotka",
  "Next photo": "Další fotka",
  "Dislike": "Nelíbí se",
  "Like": "Líbí se",
  "Swipe to decide": "Přejetím rozhodnete",
  "Tap image edges or use ← → to browse": "Klepnutím na okraje nebo pomocí ← → listujete",
  "Undo with U": "Zpět klávesou U",
  "That's a wrap. All decisions saved.": "Hotovo. Všechna rozhodnutí jsou uložená.",
  "Back to the desk ↗": "Zpět na úvod ↗",
  "THE COLLECTIVE EDIT": "SPOLEČNÝ VÝBĚR",
  "A second": "Druhý",
  "look.": "pohled.",
  "Everyone's selections. Every photo can have another chance.": "Společný výběr. Každá fotka může dostat další šanci.",
  "Shared photo outcome": "Výsledek společného výběru",
  "♥ Liked": "♥ Líbí se",
  "× Disliked": "× Nelíbí se",
  "Select / clear page": "Vybrat / zrušit stránku",
  "0 selected": "Vybráno: 0",
  "Send selected back ↗": "Vrátit vybrané ↗",
  "Nothing here yet.": "Zatím tu nic není.",
  "New decisions will appear here. Head to Operate to start reviewing.": "Nová rozhodnutí se objeví tady. Začněte na stránce Třídit.",
  "← Previous": "← Předchozí",
  "Next →": "Další →",
  "Sending back starts a new review round, not a reversed vote. The photo leaves the current selections and CSV until reviewed again. Earlier decisions stay in its history.": "Vrácení zahájí nové kolo výběru, nikoli obrácení hlasu. Fotka do nového rozhodnutí zmizí z aktuálního výběru i CSV. Dřívější rozhodnutí zůstávají v její historii.",
  "A FRESH REVIEW ROUND": "NOVÉ KOLO VÝBĚRU",
  "Send photos back?": "Vrátit fotky k výběru?",
  "These photos will leave the current selections and CSV until reviewed again. Earlier decisions remain in their history.": "Fotky do nového rozhodnutí zmizí z aktuálního výběru i CSV. Dřívější rozhodnutí zůstávají v jejich historii.",
  "Keep selections": "Ponechat výběr",
  "Send back for review ↗": "Vrátit k výběru ↗",
  "A shared eye for the good stuff.": "Společně najdeme ty nejlepší.",
  "PHOTO GRINDR / LOOK • CHOOSE • REPEAT": "PHOTO GRINDR / DÍVEJTE SE • VYBÍREJTE • POKRAČUJTE",
  "Enter · Photo Grindr": "Vstup · Photo Grindr",
  "A good shot": "Dobrá fotka",
  "deserves a": "si zaslouží",
  "second look.": "druhý pohled.",
  "One library. A few fresh eyes. Enter the shared PIN to help find the keepers.": "Jedna knihovna, více pohledů. Zadejte společný PIN a pomozte vybrat ty nejlepší fotky.",
  "Shared entry PIN": "Společný vstupní PIN",
  "Enter PIN": "Zadejte PIN",
  "Enter the photo desk": "Přejít k výběru fotek",
  "A shared space, not a personal account. Choose your player after entering.": "Společný prostor, ne osobní účet. Po vstupu si vyberete hráče.",
  "Fewer maybes. More keepers.": "Méně váhání. Více skvělých fotek.",
  "LOOK • CHOOSE • REPEAT": "DÍVEJTE SE • VYBÍREJTE • POKRAČUJTE",
  "Please enter the shared PIN again.": "Zadejte prosím znovu společný PIN.",
  "Request failed ({status}). Please try again.": "Požadavek selhal ({status}). Zkuste to prosím znovu.",
  "Your package expired after 10 minutes without an operation. Saved decisions are safe. Choose a fresh package.": "Po 10 minutách bez aktivity platnost balíčku vypršela. Uložená rozhodnutí zůstávají. Vyberte si nový balíček.",
  "Undo outcome is unresolved. Retry Undo before another operation.": "Výsledek vrácení není potvrzený. Než budete pokračovat, zkuste znovu Zpět.",
  "Package expired. Unanswered photos were released; saved decisions are safe. Choose a fresh package.": "Platnost balíčku vypršela. Nerozhodnuté fotky se uvolnily; uložená rozhodnutí zůstávají. Vyberte si nový balíček.",
  "{error} Latest data has been requested. Review it before trying again.": "{error} Byla vyžádána aktuální data. Před dalším pokusem je zkontrolujte.",
  "No player selected": "Není vybraný hráč",
  "Package complete": "Balíček dokončen",
  "{answered} of {total} decisions saved": "Uloženo {answered} z {total} rozhodnutí",
  "Review this package →": "Zobrazit dokončený balíček →",
  "The remaining photos are reserved by other players. Come back when they finish or their reservations expire.": "Zbývající fotky mají rezervované ostatní hráči. Vraťte se, až skončí nebo jim rezervace vyprší.",
  "The queue is clear. Explore the shared selections, or return photos for another look.": "Fronta je prázdná. Prohlédněte si společný výběr nebo vraťte fotky k novému posouzení.",
  "A smaller package is offered when fewer photos are available.": "Pokud je k dispozici méně fotek, dostanete menší balíček.",
  "Remaining: {count} photos": "Zbývá {count} fotek",
  "Package complete. Every decision is saved.": "Balíček je hotový. Všechna rozhodnutí jsou uložená.",
  "Decision saved.": "Rozhodnutí uloženo.",
  "Undo response was incomplete. Retry Undo to confirm its outcome.": "Odpověď na vrácení nebyla úplná. Zkuste znovu Zpět a ověřte výsledek.",
  "Last eligible action undone.": "Poslední vratná akce byla vrácena.",
  "Existing or similar players — select a name to use it.": "Existující nebo podobní hráči — kliknutím vyberte jméno.",
  "Known players — select your name, or enter a new one.": "Známí hráči — vyberte své jméno nebo zadejte nové.",
  "No matching players. Continue to create this name.": "Žádný odpovídající hráč. Pokračováním vytvoříte toto jméno.",
  "No players yet. Enter your name to get started.": "Zatím tu nejsou žádní hráči. Začněte zadáním svého jména.",
  "Playing as {name}.": "Hrajete jako {name}.",
  "{count} shared liked photos": "Společné fotky Líbí se: {count}",
  "{count} shared disliked photos": "Společné fotky Nelíbí se: {count}",
  "Page {page} of {pages}": "Stránka {page} z {pages}",
  "No pages": "Žádné stránky",
  "Preview unavailable: {filename}": "Náhled není k dispozici: {filename}",
  "Select {path}": "Vybrat {path}",
  "Reviewed by {name}": "Vybral/a {name}",
  "Shared decision": "Společné rozhodnutí",
  "{count} selected": "Vybráno: {count}",
  "Choose a player before exploring so returns can be attributed.": "Před prohlížením si vyberte hráče, aby bylo možné označit autora vrácení fotek.",
  "Send {count} photos back?": "Vrátit fotky k výběru (počet: {count})?",
  "Photos returned to the shared review queue.": "Fotky byly vráceny do společné fronty k výběru.",
  "No photos are available right now. Other players may have reserved the remaining work.": "Teď nejsou k dispozici žádné fotky. Zbývající mohou mít rezervované ostatní hráči.",
  "Package expired.": "Platnost balíčku vypršela.",
  "Network error. Please try again.": "Chyba připojení. Zkuste to prosím znovu.",
  "Switch to English": "Přepnout do angličtiny",
  "Switch to Czech": "Přepnout do češtiny",
  "Nothing remains in this package. Undo a decision or head home for the next round.": "V balíčku už nic nezbývá. Vraťte poslední rozhodnutí nebo si na úvodní stránce vezměte další balíček."
};
  const reverse = new Map(Object.entries(messages).map(([en, cs]) => [cs, en]));
  let language = 'cs';
  const bindings = new Map();
  const format = (value, vars) => value.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
  const keyFor = key => Object.hasOwn(messages, key) ? key : reverse.get(key);
  function t(key, vars = {}) {
    const source = keyFor(key) || key;
    let value = language === 'en' ? source : messages[source] || source;
    if (source === 'Remaining: {count} photos') {
      const count = Number(vars.count);
      value = language === 'en' ? (count === 1 ? 'Remaining: {count} photo' : source)
        : count === 1 ? 'Zbývá {count} fotka' : count >= 2 && count <= 4 ? 'Zbývají {count} fotky' : 'Zbývá {count} fotek';
    }
    if (source === 'Send {count} photos back?' && Number(vars.count) === 1) value = language === 'en' ? 'Send this photo back?' : 'Vrátit tuto fotku k výběru?';
    return format(value, vars);
  }
  function bind(element, key, vars = {}, attribute = null) {
    const source = keyFor(key);
    let entries = bindings.get(element);
    if (!entries) { entries = new Map(); bindings.set(element, entries); }
    if (source) entries.set(attribute, {key:source, vars}); else entries.delete(attribute);
    const value = source ? t(source, vars) : String(key);
    if (attribute) element.setAttribute(attribute, value); else element.textContent = value;
  }
  function raw(element, value) { bindings.delete(element); element.textContent = String(value); }
  function setLanguage(value) {
    language = value === 'en' ? 'en' : 'cs';
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    for (const [element, entries] of bindings) {
      if (element.isConnected === false) { bindings.delete(element); continue; }
      for (const [attribute, entry] of entries) {
      const value = (entry.prefix || '') + t(entry.key, entry.vars) + (entry.suffix || '');
      if (attribute) element.setAttribute(attribute,value); else element.textContent=value;
      }
    }
    const toggle = document.getElementById('language-toggle');
    if (toggle) { toggle.textContent=language === 'cs' ? 'EN' : 'CS'; toggle.setAttribute('aria-label',language === 'cs' ? 'Přepnout do angličtiny' : 'Switch to Czech'); toggle.disabled=false; }
  }
  function initialize() {
    language = /(?:^|;\s*)lang=en(?:;|$)/.test(document.cookie || '') ? 'en' : 'cs';
    // Bind only original template text. User names, filenames and backend errors
    // added later are never walked or guessed to be translatable text.
    if (document.createTreeWalker) {
      const walker = document.createTreeWalker(document.documentElement, 4);
      const nodes = []; let node;
      while ((node = walker.nextNode())) nodes.push(node);
      for (const node of nodes) {
        if (['SCRIPT','STYLE'].includes(node.parentElement?.tagName)) continue;
        const trimmed=node.textContent.trim(), key=keyFor(trimmed) && (node.parentElement?.getAttribute('data-i18n-text') || keyFor(trimmed));
        if (key) { const space=node.textContent.match(/^(\s*)[\s\S]*?(\s*)$/); bind(node,key); const entry=bindings.get(node).get(null); entry.vars={}; entry.prefix=space[1]; entry.suffix=space[2]; }
      }
    }
    document.querySelectorAll('[aria-label], [placeholder], [title]').forEach(element => {
      for (const attribute of ['aria-label','placeholder','title']) {
        const value=element.getAttribute(attribute); if (value && keyFor(value)) bind(element,value,{},attribute);
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key=element.getAttribute('data-i18n-title'); if (key) bind(element,key);
    });
    setLanguage(language);
    document.getElementById('language-toggle')?.addEventListener('click', () => {
      const next=language === 'cs' ? 'en' : 'cs';
      document.cookie=`lang=${next}; Path=/; SameSite=Lax; Max-Age=31536000`;
      setLanguage(next);
    });
  }
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded',initialize);
  return {t, bind, raw, setLanguage, get language(){return language;}};
})();
if (typeof module !== 'undefined') module.exports = PhotoI18n;
