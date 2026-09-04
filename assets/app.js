/* ARCHETYP WARSZTAT — skrypt tylko tej strony. Bez zależności.
 *
 * Formularz wyceny działa BEZ SERWERA: waliduje, składa czytelne zgłoszenie
 * i przekazuje je na telefon warsztatu (WhatsApp, SMS jako zapas). U realnego
 * klienta podmienia się wyłącznie numer w site.config.json.
 *
 * Listy marek, roczników i usług przychodzą z daneJson, więc skrypt nie zna
 * żadnej treści na sztywno i nie trzeba go tłumaczyć.
 */
(function () {
  'use strict';

  var T = {}, D = {};
  try { T = JSON.parse(document.getElementById('i18n').textContent) || {}; } catch (e) {}
  try { D = JSON.parse(document.getElementById('dane').textContent) || {}; } catch (e) {}
  var t = function (k, d) { return T[k] || d || ''; };
  var spokojnie = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };

  var belka = $('.belka');
  if (belka) {
    var cien = function () { belka.classList.toggle('przewiniety', window.scrollY > 30); };
    cien(); window.addEventListener('scroll', cien, { passive: true });
  }

  var btnMenu = $('.ham'), menu = document.getElementById('mm');
  if (btnMenu && menu) {
    var etyk = btnMenu.getAttribute('aria-label');
    btnMenu.addEventListener('click', function () {
      var otwarte = menu.classList.toggle('otwarte');
      btnMenu.setAttribute('aria-expanded', String(otwarte));
      btnMenu.setAttribute('aria-label', otwarte ? t('closeMenu', etyk) : etyk);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('otwarte'); btnMenu.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('otwarte')) btnMenu.click();
    });
  }

  if ('IntersectionObserver' in window && !spokojnie) {
    var cele = document.querySelectorAll('.zaufanie-poz, .cennik tbody tr, .krok, .marki-lista li, .opinia, .hala-punkty li');
    var io = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (!w.isIntersecting) return;
        w.target.style.transition = 'opacity .32s linear, transform .32s cubic-bezier(.3,.7,.3,1)';
        w.target.style.opacity = 1; w.target.style.transform = 'none';
        io.unobserve(w.target);
      });
    }, { rootMargin: '0px 0px -5% 0px', threshold: .05 });
    [].forEach.call(cele, function (el, i) {
      el.style.opacity = 0; el.style.transform = 'translateY(10px)';
      el.style.transitionDelay = (i % 6) * 40 + 'ms';
      io.observe(el);
    });
  }

  [].forEach.call(document.querySelectorAll('a.lang'), function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('jezyk', (a.getAttribute('hreflang') || a.textContent).trim().toLowerCase().slice(0, 2)); } catch (e) {}
    });
  });

  /* ============================================================ wycena */
  var form = document.getElementById('wycena');
  if (!form) return;

  var poleMarka = document.getElementById('pole-marka');
  var poleRok = document.getElementById('pole-rok');
  var poleUsluga = document.getElementById('pole-usluga');
  var komunikat = document.getElementById('wycena-komunikat');

  function wypelnij(select, lista, pierwszaPusta) {
    select.innerHTML = '';
    if (pierwszaPusta) {
      var p = document.createElement('option');
      p.value = ''; p.textContent = (D.slowa && D.slowa.choose) || '—';
      select.appendChild(p);
    }
    (lista || []).forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      select.appendChild(o);
    });
  }

  wypelnij(poleMarka, (D.marki || []).concat([(D.slowa && D.slowa.other) || '']).filter(Boolean), true);
  wypelnij(poleRok, D.lata || [], true);
  wypelnij(poleUsluga, D.uslugi || [], true);

  function pokaz(txt, zle) {
    komunikat.textContent = txt;
    komunikat.className = 'wycena-komunikat ' + (zle ? 'zle' : 'ok');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var rej = document.getElementById('pole-rej').value.trim().toUpperCase();
    var marka = poleMarka.value;
    var model = document.getElementById('pole-model').value.trim();
    var rok = poleRok.value;
    var usluga = poleUsluga.value;
    var tel = document.getElementById('pole-tel').value.trim();

    // Rejestracja i rocznik są pomocne, ale nieobowiązkowe — im mniej pól
    // z gwiazdką, tym więcej zgłoszeń trafia do warsztatu.
    if (!marka || !model || !usluga) { pokaz(t('qFill'), true); return; }
    if (tel.replace(/\D/g, '').length < 9) { pokaz(t('qPhone'), true); return; }

    var tresc = [
      D.firma,
      '---',
      usluga,
      [marka, model, rok].filter(Boolean).join(' '),
      rej ? 'nr rej.: ' + rej : '',
      '---',
      tel
    ].filter(Boolean).join('\n');

    var numer = String(D.tel || '').replace(/\D/g, '');
    if (!numer) { pokaz(t('qNoChannel'), true); return; }

    pokaz(t('qOpening'), false);
    var okno = window.open('https://wa.me/' + numer + '?text=' + encodeURIComponent(tresc), '_blank', 'noopener');
    if (!okno) location.href = 'sms:+' + numer + '?body=' + encodeURIComponent(tresc);
    setTimeout(function () { pokaz(t('qDone'), false); }, 900);
  });

  /* Znacznik biezacej godziny na osi doby. Tylko przegladarka zna czas
     ogladajacego, wiec kreske stawiamy tutaj, nie przy budowaniu. */
  (function(){
    var os=document.querySelector('.os-tygodnia');
    if(!os) return;
    var OD=6*60, DO=20*60;
    var t=new Date(), m=t.getHours()*60+t.getMinutes();
    var i=(t.getDay()+6)%7;
    var el=os.querySelector('.os-dzien[data-dzien="'+i+'"]');
    if(el) el.classList.add('dzis');
    if(m<OD||m>DO) return;
    os.style.setProperty('--teraz', ((m-OD)/(DO-OD)).toFixed(4));
    os.classList.add('ma-teraz');
  })();
})();
