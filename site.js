// Тонус — живость сайта. Всё движение только при разрешении: системная настройка или ?motion=1.
(() => {
  const root = document.documentElement;
  const q = new URLSearchParams(location.search);
  let forced = null;
  try {
    if (q.has('motion')) localStorage.setItem('tonus-motion', q.get('motion'));
    forced = localStorage.getItem('tonus-motion');
  } catch (e) { forced = q.get('motion'); }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const motion = forced === '1' || (forced !== '0' && !reduced);
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (motion) root.classList.add('motion');

  // ── шапка становится стеклом после первого экрана
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-solid', scrollY > 40);
  onScroll();
  addEventListener('scroll', onScroll, {passive: true});

  // ── 3D-гиря: настоящая модель, крутится сама и пальцем; если не загрузилась — остаётся картинка
  const kb = document.getElementById('kb3d');
  if (kb) {
    const holder = kb.closest('.float--kb');
    customElements.whenDefined('model-viewer').then(() => {
      kb.addEventListener('load', () => {
        // глянец как у рендера: меньше шероховатости, цвет чуть сочнее
        const m = kb.model?.materials?.[0];
        try {
          m?.pbrMetallicRoughness.setRoughnessFactor(.28);
          m?.pbrMetallicRoughness.setBaseColorFactor([.92, 1, .78, 1]);
        } catch (e) { /* модель без PBR — оставляем как есть */ }
        holder.classList.add('has-3d');
      }, {once: true});
      kb.addEventListener('error', () => kb.remove(), {once: true});
      if (!motion) kb.removeAttribute('auto-rotate');
      kb.src = 'img/kettle.glb?v=2';
    });
  }

  // ── параллакс сцены героя за курсором
  const stage = document.getElementById('stage');
  if (stage && motion && fine) {
    const layers = [...stage.querySelectorAll('[data-depth]')];
    let raf = 0, tx = 0, ty = 0;
    stage.closest('.hero').addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) / r.width;
      ty = (e.clientY - (r.top + r.height / 2)) / r.height;
      if (!raf) raf = requestAnimationFrame(() => {
        raf = 0;
        for (const el of layers) {
          const d = +el.dataset.depth;
          el.style.transform = `translate3d(${(-tx * d).toFixed(1)}px, ${(-ty * d).toFixed(1)}px, 0)`;
        }
      });
    });
  }

  // ── наклон карточек до 7° и блик за курсором (только мышь)
  if (fine && motion) {
    for (const el of document.querySelectorAll('.tilt')) {
      const max = el.classList.contains('dish') ? 5 : 7;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.classList.add('is-tilting');
        el.style.setProperty('--ry', `${((x - .5) * max * 2).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((.5 - y) * max * 2).toFixed(2)}deg`);
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('is-tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    }
    const phones = document.getElementById('phones');
    phones?.addEventListener('pointermove', (e) => {
      const r = phones.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      phones.classList.add('is-tilting');
      phones.style.setProperty('--ry', `${(-16 + x * 14).toFixed(2)}deg`);
      phones.style.setProperty('--rx', `${(8 - y * 10).toFixed(2)}deg`);
    });
    phones?.addEventListener('pointerleave', () => {
      phones.classList.remove('is-tilting');
      phones.style.removeProperty('--ry');
      phones.style.removeProperty('--rx');
    });
  }

  // ── появление секций
  if (motion && 'IntersectionObserver' in window) {
    const els = document.querySelectorAll('.sec__head, .pcard, .course__photo, .course__copy, .quiz__ask, .dish, .group__copy, .group__photo, .app__copy, .phones, .about__card, .faq__list, .final__card');
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }, {rootMargin: '0px 0px -10% 0px'});
    els.forEach((el, i) => {
      el.classList.add('reveal');
      if (el.matches('.pcard, .dish')) el.style.transitionDelay = `${(i % 3) * 90}ms`;
      io.observe(el);
    });
  }

  // ── курс: дома / в зале
  const placeBtns = document.querySelectorAll('[data-place-btn]');
  placeBtns.forEach((b) => b.addEventListener('click', () => {
    const p = b.dataset.placeBtn;
    placeBtns.forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('[data-place]').forEach((img) => (img.hidden = img.dataset.place !== p));
    document.querySelectorAll('[data-kit]').forEach((k) => (k.hidden = k.dataset.kit !== p));
  }));
  // стрелки внутри переключателя, как у вкладок
  document.querySelector('.seg')?.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const list = [...placeBtns];
    const i = list.indexOf(document.activeElement);
    const n = list[(i + (e.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length];
    n.focus(); n.click();
  });

  // ── питание: меню под ответы
  const MENUS = {
    tone: {
      15: [['Йогурт с гранолой и киви', 380, 22, 12, 44], ['Курица, брокколини, горошек', 460, 41, 14, 32], ['Боул с лососем и киноа', 520, 34, 22, 41]],
      30: [['Сырники из печи с ягодами', 410, 28, 12, 46], ['Курица с запечёнными овощами', 480, 42, 16, 34], ['Лосось, киноа и авокадо', 540, 35, 24, 40]],
    },
    light: {
      15: [['Йогурт, киви и семена чиа', 290, 20, 8, 32], ['Курица с брокколини на пару', 360, 40, 9, 22], ['Лёгкий боул с лососем', 420, 31, 17, 30]],
      30: [['Омлет с зеленью и яблоком', 310, 22, 15, 20], ['Индейка с брокколини и пюре', 380, 41, 10, 26], ['Лосось на пару с киноа', 440, 33, 18, 32]],
    },
    energy: {
      15: [['Гранола, йогурт, киви, банан', 450, 20, 14, 62], ['Курица, горошек и булгур', 540, 42, 15, 55], ['Боул с лососем и рисом', 580, 34, 21, 58]],
      30: [['Овсянка на ночь с киви', 460, 21, 13, 64], ['Курица, овощи и паста', 560, 43, 16, 58], ['Лосось, киноа и батат', 600, 35, 22, 60]],
    },
  };
  const state = {goal: 'tone', time: '15'};
  const menu = document.querySelector('.menu');
  const renderMenu = () => {
    const list = MENUS[state.goal][state.time];
    const apply = () => {
      list.forEach(([name, kcal, b, f, c], i) => {
        document.querySelector(`[data-dish="${i}"]`).textContent = name;
        document.querySelector(`[data-kbju="${i}"]`).innerHTML =
          `<span>${kcal} ккал</span><span>Б ${b}</span><span>Ж ${f}</span><span>У ${c}</span>`;
      });
      menu.classList.remove('is-swapping');
    };
    if (motion) { menu.classList.add('is-swapping'); setTimeout(apply, 220); } else apply();
  };
  const bindPills = (attr, key) => {
    const btns = document.querySelectorAll(`[data-${attr}]`);
    btns.forEach((b) => b.addEventListener('click', () => {
      btns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      state[key] = b.dataset[attr];
      renderMenu();
    }));
  };
  bindPills('goal', 'goal');
  bindPills('time', 'time');
  renderMenu();

  // ── предварительная запись: шаг 1 анкета, шаг 2 «ты в списке». «Назад» телефона закрывает окно.
  // Пока цен нет, заявка уходит на приёмник с админкой. Когда вернём оплату, это окно меняется обратно.
  const host = location.hostname;
  const API = /(^|\.)shahkris\.ru$|\.sslip\.io$/.test(host) ? '/api/lead'
    : /^(localhost|127\.0\.0\.1)$/.test(host) ? 'http://localhost:8831/api/lead'
    : 'https://shahkris.ru/api/lead';
  const dlg = document.getElementById('buy');
  const form = document.getElementById('buy-form');
  const steps = form.querySelectorAll('.step');
  const sendBtn = document.getElementById('pay-btn');
  const fName = document.getElementById('f-name');
  const fTg = document.getElementById('f-tg');
  const fIg = document.getElementById('f-ig');
  const hint = document.getElementById('e-contact');
  const formErr = document.getElementById('e-form');
  const fConsent = document.getElementById('f-consent');
  const groups = [...form.querySelectorAll('.chips')];
  const DONE = {
    course: 'Напишу тебе, как только откроем курс. Первыми зайдут те, кто в этом списке.',
    personal: 'Напишу тебе в течение пары дней, подберём время первой тренировки.',
    group: 'Напишу тебе перед первым эфиром группы и пришлю расписание.',
  };
  let pushed = false, lastFocus = null, busy = false;

  const showStep = (n) => steps.forEach((s) => (s.hidden = s.dataset.step !== String(n)));
  const setErr = (input, bad) => {
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    const id = (input.getAttribute('aria-describedby') || '').split(' ').pop();
    const err = id && document.getElementById(id);
    if (err && err.classList.contains('err')) err.hidden = !bad;
  };
  const clearAll = () => {
    [fName, fTg, fIg, fConsent, ...groups].forEach((i) => setErr(i, false));
    hint.classList.remove('is-err');
    hint.textContent = 'Хватит одного, куда тебе удобнее написать.';
    formErr.hidden = true;
  };
  const open = (product) => {
    lastFocus = document.activeElement;
    form.reset();
    const r = form.querySelector(`input[name="product"][value="${product}"]`);
    if (r) r.checked = true;
    clearAll();
    showStep(1);
    dlg.showModal();
    dlg.scrollTop = 0;
    fName.focus();
    history.pushState({buy: true}, '');
    pushed = true;
  };
  const close = () => { if (dlg.open) dlg.close(); };
  dlg.addEventListener('close', () => {
    if (pushed) { pushed = false; history.back(); }
    lastFocus?.focus?.();
  });
  addEventListener('popstate', () => { if (pushed) { pushed = false; dlg.close(); } });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  form.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => open(b.dataset.buy)));
  // из приложения приходят по ссылке /#zapis-course: сразу открываем анкету на нужном продукте
  const fromApp = /^#zapis-(course|personal|group)$/.exec(location.hash);
  if (fromApp) {
    history.replaceState(null, '', location.pathname + location.search + '#formats');
    document.getElementById('formats')?.scrollIntoView();
    open(fromApp[1]);
  }

  [fName, fTg, fIg].forEach((i) => i.addEventListener('input', () => {
    if (i.getAttribute('aria-invalid') === 'true') setErr(i, false);
    if (i !== fName && hint.classList.contains('is-err')) { hint.classList.remove('is-err'); hint.textContent = 'Хватит одного, куда тебе удобнее написать.'; }
  }));
  groups.forEach((g) => g.addEventListener('change', () => setErr(g, false)));
  fConsent.addEventListener('change', () => fConsent.checked && setErr(fConsent, false));

  const handle = (v, re) => v.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(re, '').replace(/^@+/, '').split(/[/?#]/)[0];
  const pick = (name) => (form.querySelector(`input[name="${name}"]:checked`)?.value || '').replace(/\u00a0/g, ' ');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    formErr.hidden = true;
    const name = fName.value.trim();
    const tg = handle(fTg.value, /^t(elegram)?\.me\//i);
    const ig = handle(fIg.value, /^instagram\.com\//i);
    const badTg = tg && !/^[A-Za-z0-9_]{5,32}$/.test(tg);
    const badIg = ig && !/^[A-Za-z0-9_.]{1,30}$/.test(ig);
    const noContact = !tg && !ig;
    setErr(fName, name.length < 2);
    setErr(fTg, badTg);
    setErr(fIg, badIg);
    hint.classList.toggle('is-err', noContact);
    hint.textContent = noContact ? 'Оставь Telegram или Instagram, чтобы я могла тебе написать' : 'Хватит одного, куда тебе удобнее написать.';
    const answers = {};
    groups.forEach((g) => { const n = g.querySelector('input').name; answers[n] = pick(n); setErr(g, !answers[n]); });
    setErr(fConsent, !fConsent.checked);
    const firstBad = name.length < 2 ? fName : badTg || (noContact) ? fTg : badIg ? fIg
      : groups.find((g) => g.getAttribute('aria-invalid') === 'true')?.querySelector('input')
      || (!fConsent.checked ? fConsent : null);
    if (firstBad) { firstBad.focus(); return; }

    const product = pick('product') || 'course';
    busy = true;
    sendBtn.setAttribute('aria-busy', 'true');
    sendBtn.innerHTML = '<span class="spin" aria-hidden="true"></span><span>Отправляем</span>';
    let ok = false;
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          product, name, telegram: tg ? '@' + tg : '', instagram: ig ? '@' + ig : '',
          ...answers, note: document.getElementById('f-note').value.trim(),
          company: form.company.value, source: location.hostname, consent: true,
        }),
      });
      ok = res.ok;
      if (!ok) formErr.textContent = res.status === 429 ? 'Слишком много попыток подряд. Подожди пару минут и отправь ещё раз.' : 'Что-то не сохранилось. Проверь поля и отправь ещё раз.';
    } catch (err) {
      formErr.textContent = 'Нет связи. Проверь интернет и отправь ещё раз.';
    }
    busy = false;
    sendBtn.removeAttribute('aria-busy');
    sendBtn.innerHTML = '<span class="pay-label">Записаться</span>';
    if (!ok) { formErr.hidden = false; return; }
    document.getElementById('done-title').textContent = `${name}, ты в списке!`;
    document.getElementById('done-text').textContent = DONE[product];
    showStep(2);
    dlg.scrollTop = 0;
    dlg.querySelector('.step--done .btn--lime').focus();
  });
})();
