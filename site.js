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

  // ── окно покупки: шаг 1 форма, шаг 2 готово. «Назад» телефона закрывает окно.
  const dlg = document.getElementById('buy');
  const form = document.getElementById('buy-form');
  const steps = form.querySelectorAll('.step');
  const payBtn = document.getElementById('pay-btn');
  const fName = document.getElementById('f-name');
  const fContact = document.getElementById('f-contact');
  const DONE = {
    course: ['Курс твой!', 'Доступ к «Тонус за 6 недель» уже в приложении. Начни с анкеты, и я соберу тебе меню.'],
    personal: ['Ты записана!', 'Я напишу тебе в течение дня, и выберем время первой тренировки.'],
    group: ['Добро пожаловать в группу!', 'Ближайший эфир в понедельник в 8:00 по Москве. Напоминание придёт в приложение.'],
  };
  let pushed = false, lastFocus = null;

  const showStep = (n) => steps.forEach((s) => (s.hidden = s.dataset.step !== String(n)));
  const setErr = (input, msg) => {
    const err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    err.hidden = !msg;
  };
  const open = (product) => {
    lastFocus = document.activeElement;
    form.reset();
    const r = form.querySelector(`input[name="product"][value="${product}"]`);
    if (r) r.checked = true;
    [fName, fContact].forEach((i) => setErr(i, ''));
    showStep(1);
    dlg.showModal();
    fName.focus();
    history.pushState({buy: true}, '');
    pushed = true;
  };
  const close = () => {
    if (!dlg.open) return;
    dlg.close();
  };
  dlg.addEventListener('close', () => {
    if (pushed) { pushed = false; history.back(); }
    lastFocus?.focus?.();
  });
  addEventListener('popstate', () => {
    if (pushed) { pushed = false; dlg.close(); }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  form.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => open(b.dataset.buy)));

  [fName, fContact].forEach((i) => i.addEventListener('input', () => i.getAttribute('aria-invalid') === 'true' && setErr(i, '')));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = fName.value.trim();
    const contact = fContact.value.trim();
    const digits = contact.replace(/\D/g, '');
    const okContact = /^@[a-zA-Z0-9_]{4,}$/.test(contact) || (digits.length >= 10 && digits.length <= 11 && !/[a-zA-Zа-яА-Я]/.test(contact));
    setErr(fName, name ? '' : 'err');
    setErr(fContact, okContact ? '' : 'err');
    const firstBad = !name ? fName : !okContact ? fContact : null;
    if (firstBad) { firstBad.focus(); return; }

    const product = form.querySelector('input[name="product"]:checked')?.value || 'course';
    payBtn.setAttribute('aria-busy', 'true');
    payBtn.innerHTML = '<span class="spin" aria-hidden="true"></span><span>Проводим оплату</span>';
    setTimeout(() => {
      payBtn.removeAttribute('aria-busy');
      payBtn.innerHTML = '<span class="pay-label">Оплатить</span>';
      const [t, txt] = DONE[product];
      document.getElementById('done-title').textContent = `${name}, ${t.charAt(0).toLowerCase()}${t.slice(1)}`;
      document.getElementById('done-text').textContent = txt;
      showStep(2);
      dlg.querySelector('.step--done .btn--lime').focus();
    }, 1100);
  });
})();
