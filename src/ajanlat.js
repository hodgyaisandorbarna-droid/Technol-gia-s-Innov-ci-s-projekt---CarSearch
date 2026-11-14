// A vevő oldala: az ajánlatkérés üzenetváltása. A vevő nem ír szabad szöveget,
// csak előre megírt válaszok közül választ: elfogadom / elutasítom / más színt kérek.
import { findRequest, getRequest, answerOffer, STATUS_LABEL } from './store.js';
import { renderMessages, colorPicker, esc } from './chat.js';

const login = document.getElementById('login');
const mine = document.getElementById('mine');
const SESSION = 'carsearch.me';
let me = null;      // { id, email }
let picking = false;

const session = {
  get() { try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch { return null; } },
  set(v) { try { v ? sessionStorage.setItem(SESSION, JSON.stringify(v)) : sessionStorage.removeItem(SESSION); } catch { /* nem baj */ } },
};

function render() {
  const r = me && findRequest(me.id, me.email);
  login.hidden = !!r;
  mine.hidden = !r;
  if (!r) return;
  const pending = [...r.messages].reverse().find(m => m.type === 'offer' && !m.valasz);
  const closing = {
    elfogadva: 'Elfogadtad az ajánlatot. Hamarosan keresünk a következő lépésekkel.',
    szallitas: 'Az autód úton van hozzád.',
    atadva: 'Az autót átadtuk. Jó utat!',
    elutasitva: 'Ezt az ajánlatkérést lezártuk. Ha újra keresnél, indíts új ajánlatkérést az oldalon.',
  }[r.status];
  mine.innerHTML = `
    <div class="adm-head">
      <div class="d-head">
        <h1>${esc(r.modell)}</h1>
        <p>${r.id} · ${STATUS_LABEL[r.status]}</p>
      </div>
      <button type="button" class="quiet" data-act="logout">Kilépés</button>
    </div>
    <section class="chat" aria-label="Üzenetek">
      <ol class="msgs" id="msgs">${renderMessages(r, 'ugyfel')}</ol>
      ${pending ? `
        <form class="answers" id="answers">
          <p><b>Mit szólsz az ajánlathoz?</b></p>
          ${picking ? `
            <fieldset>
              <legend>Milyen színben szeretnéd?</legend>
              ${colorPicker('szin')}
              <p class="error" id="colorError" role="alert" hidden>Válassz legalább egy színt.</p>
            </fieldset>
            <div class="actions">
              <button type="button" class="quiet" data-act="cancel">Mégse</button>
              <button type="submit">Színkérés elküldése</button>
            </div>` : `
            <div class="actions start">
              <button type="button" data-ans="accept">Elfogadom</button>
              <button type="button" class="quiet" data-ans="color">Más színt kérek</button>
              <button type="button" class="quiet" data-ans="reject">Elutasítom</button>
            </div>`}
        </form>` : `<p class="chat-foot">${closing || (r.messages.length ? 'Dolgozunk rajta – amint van új ajánlat, itt találod.' : 'Megkaptuk a kérésed. Amint találunk megfelelő autót, itt jelentkezünk az ajánlattal.')}</p>`}
    </section>`;
  const msgs = document.getElementById('msgs');
  msgs.lastElementChild?.scrollIntoView({ block: 'nearest' });
}

login.addEventListener('submit', e => {
  e.preventDefault();
  const r = findRequest(login.elements.id.value, login.elements.email.value);
  document.getElementById('loginError').hidden = !!r;
  if (!r) return;
  me = { id: r.id, email: r.kapcsolat.email };
  session.set(me);
  render();
});

mine.addEventListener('click', e => {
  const ans = e.target.closest('[data-ans]')?.dataset.ans;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (ans === 'color') { picking = true; render(); mine.querySelector('.swatch input')?.focus(); }
  else if (ans === 'reject' && !confirm('Biztosan elutasítod ezt az ajánlatot?')) return;
  else if (ans) { answerOffer(me.id, ans); render(); }
  else if (act === 'cancel') { picking = false; render(); }
  else if (act === 'logout') { me = null; picking = false; session.set(null); login.reset(); render(); }
});

mine.addEventListener('submit', e => {
  e.preventDefault();
  const colors = new FormData(e.target).getAll('szin');
  document.getElementById('colorError').hidden = colors.length > 0;
  if (!colors.length) return;
  answerOffer(me.id, 'color', colors);
  picking = false;
  render();
});

// Ha az admin közben válaszolt (másik lapon), frissül
window.addEventListener('storage', render);

// Belépés: korábbi munkamenet, vagy az ajánlatkérés utáni hivatkozás (?id=K-1001)
const saved = session.get();
if (saved && getRequest(saved.id)) me = saved;
const fromLink = new URLSearchParams(location.search).get('id');
if (fromLink && !me) login.elements.id.value = fromLink;
render();
