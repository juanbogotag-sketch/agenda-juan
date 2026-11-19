/* Agenda personal de Juan Pablo González Bogotá.
   Los eventos viven solo en este dispositivo (localStorage "agenda_juan_v1");
   nada se envía a ningún servidor. Los perfiles se leen del Repositorio
   (datos_foro.js del sitio madre) y los contactos de js/contactos.js
   (foto fija del Repositorio, 19 nov 2026). */
(function () {
  'use strict';

  var LS_KEY = 'agenda_juan_v1';

  /* ---------- Perfiles del Repositorio (solo lectura) ---------- */
  var PEOPLE = [];
  (typeof PERFILES_EX !== 'undefined' ? PERFILES_EX : []).forEach(function (p) {
    PEOPLE.push({
      cat: p.cat || 'ejecutivo', key: 'ex|' + p.id, id: p.id,
      name: p.name, title: p.title || '', title_en: p.title_en || p.title || '',
      org: p.org || '', dep: p.dep || '',
      es: p.es || '', en: p.en || '', photo: p.photo || ''
    });
  });
  (typeof FICHAS_EX !== 'undefined' ? FICHAS_EX : []).forEach(function (p) {
    PEOPLE.push({
      cat: p.cat, key: 'ex|' + p.id, id: p.id,
      name: p.name, title: p.title || '', title_en: p.title_en || p.title || '',
      org: p.org || '', dep: p.dep || '',
      es: '', en: '', photo: ''
    });
  });
  var BY_KEY = {};
  PEOPLE.forEach(function (p) { BY_KEY[p.key] = p; });

  /* ---------- Utilidades ---------- */
  function $(s) { return document.querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function initials(name) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var DIAS_C = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromISO(s) { var a = s.split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function mondayOf(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // lunes = 0
    return x;
  }
  function fmtFechaLarga(d) {
    return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
  }
  function newId() {
    return 'ev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- Eventos (localStorage, solo en este dispositivo) ---------- */
  function loadEvents() {
    try { var v = JSON.parse(localStorage.getItem(LS_KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function saveEvents(list) { localStorage.setItem(LS_KEY, JSON.stringify(list)); }

  var events = loadEvents();
  var weekStart = mondayOf(new Date());
  var editingId = null;      // id del evento en edición, o null si es nuevo
  var detailId = null;       // id del evento abierto en el detalle
  var formAttendees = [];    // asistentes mientras el formulario está abierto

  /* ---------- Semana ---------- */
  function renderWeek() {
    var end = new Date(weekStart); end.setDate(end.getDate() + 6);
    $('#weekLabel').textContent = weekStart.getDate() + ' ' + MESES[weekStart.getMonth()].slice(0, 3) +
      ' — ' + end.getDate() + ' ' + MESES[end.getMonth()].slice(0, 3) + ' ' + end.getFullYear();
    var today = toISO(new Date());
    var html = '';
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekStart); d.setDate(d.getDate() + i);
      var iso = toISO(d);
      var dayEv = events.filter(function (e) { return e.date === iso; })
        .sort(function (a, b) { return (a.start || '').localeCompare(b.start || ''); });
      html += '<section class="day' + (iso === today ? ' today' : '') + '">' +
        '<header><span class="dow">' + DIAS_C[d.getDay()] + '</span>' +
        '<span class="dnum">' + d.getDate() + '</span>' +
        '<span class="dmon">' + MESES[d.getMonth()] + '</span>' +
        (iso === today ? '<span class="todayBadge">Hoy</span>' : '') + '</header>';
      if (!dayEv.length) html += '<p class="noev">Sin eventos</p>';
      dayEv.forEach(function (e) {
        html += '<button type="button" class="ev" data-id="' + esc(e.id) + '">' +
          '<span class="evtime">' + esc(e.start || '') + (e.end ? ' – ' + esc(e.end) : '') + '</span>' +
          '<span class="evname">' + esc(e.name) + '</span>' +
          (e.place ? '<span class="evplace">' + esc(e.place) + '</span>' : '') +
          '<span class="evatt">' + e.attendees.length + (e.attendees.length === 1 ? ' asistente' : ' asistentes') + '</span>' +
          '</button>';
      });
      html += '</section>';
    }
    $('#week').innerHTML = html;
    document.querySelectorAll('#week .ev').forEach(function (b) {
      b.addEventListener('click', function () { openDetail(b.dataset.id); });
    });
  }

  /* ---------- Asistentes del formulario ---------- */
  function attLabel(a) {
    if (a.type === 'repo') { var p = BY_KEY[a.key]; return p ? p.name : a.key; }
    return a.name || 'Persona externa';
  }
  function renderAttChips() {
    var box = $('#attChips');
    if (!formAttendees.length) { box.innerHTML = '<span class="chipempty">Sin asistentes todavía</span>'; return; }
    box.innerHTML = formAttendees.map(function (a, i) {
      return '<span class="chip">' + esc(attLabel(a)) +
        '<button type="button" data-i="' + i + '" aria-label="Quitar a ' + esc(attLabel(a)) + '">×</button></span>';
    }).join('');
    box.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        formAttendees.splice(+b.dataset.i, 1);
        renderAttChips();
      });
    });
  }
  function renderAttSearch() {
    var q = norm($('#attSearch').value.trim());
    var box = $('#attResults');
    if (q.length < 2) { box.innerHTML = ''; return; }
    if (!PEOPLE.length) {
      box.innerHTML = '<p class="nores">No se cargaron los perfiles del Repositorio. Revisa la conexión e inténtalo de nuevo.</p>';
      return;
    }
    var hits = PEOPLE.filter(function (p) {
      return norm(p.name + ' ' + p.title + ' ' + p.title_en + ' ' + p.org + ' ' + p.dep).indexOf(q) !== -1;
    }).slice(0, 8);
    if (!hits.length) { box.innerHTML = '<p class="nores">Ningún perfil coincide con la búsqueda.</p>'; return; }
    box.innerHTML = hits.map(function (p) {
      return '<button type="button" class="hit" data-key="' + esc(p.key) + '">' +
        '<span class="hitname">' + esc(p.name) + '</span>' +
        '<span class="hitmeta">' + esc(p.title || '') + (p.org ? ' · ' + esc(p.org) : '') + '</span></button>';
    }).join('');
    box.querySelectorAll('.hit').forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.dataset.key;
        if (!formAttendees.some(function (a) { return a.type === 'repo' && a.key === key; })) {
          formAttendees.push({ type: 'repo', key: key });
          renderAttChips();
        }
        $('#attSearch').value = '';
        box.innerHTML = '';
        $('#attSearch').focus();
      });
    });
  }

  /* ---------- Formulario: crear / editar ---------- */
  function openForm(ev, presetDate) {
    editingId = ev ? ev.id : null;
    formAttendees = ev ? JSON.parse(JSON.stringify(ev.attendees || [])) : [];
    $('#formTitle').textContent = ev ? 'Editar evento' : 'Nuevo evento';
    $('#fName').value = ev ? ev.name : '';
    $('#fDate').value = ev ? ev.date : (presetDate || toISO(new Date()));
    $('#fStart').value = ev ? (ev.start || '') : '';
    $('#fEnd').value = ev ? (ev.end || '') : '';
    $('#fPlace').value = ev ? (ev.place || '') : '';
    $('#attSearch').value = '';
    $('#attResults').innerHTML = '';
    $('#extName').value = '';
    $('#extEmail').value = '';
    $('#extPhone').value = '';
    $('#formErr').hidden = true;
    renderAttChips();
    $('#formOverlay').hidden = false;
    $('#fName').focus();
  }
  function closeForm() { $('#formOverlay').hidden = true; }

  $('#evForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('#fName').value.trim();
    var date = $('#fDate').value;
    var start = $('#fStart').value;
    var end = $('#fEnd').value.trim();
    var place = $('#fPlace').value.trim();
    var err = $('#formErr');
    if (!name || !date || !start) {
      err.textContent = 'Faltan el nombre, la fecha o la hora de inicio.';
      err.hidden = false;
      return;
    }
    if (end && end <= start) {
      err.textContent = 'La hora de fin debe ser posterior a la de inicio.';
      err.hidden = false;
      return;
    }
    var ev = {
      id: editingId || newId(),
      name: name, date: date, start: start,
      end: end || '', place: place,
      attendees: formAttendees
    };
    if (editingId) {
      var i = events.findIndex(function (x) { return x.id === editingId; });
      if (i >= 0) events[i] = ev;
    } else {
      events.push(ev);
    }
    saveEvents(events);
    closeForm();
    weekStart = mondayOf(fromISO(date));
    renderWeek();
  });
  $('#formClose').addEventListener('click', closeForm);
  $('#formCancel').addEventListener('click', closeForm);
  $('#attSearch').addEventListener('input', renderAttSearch);
  $('#extAdd').addEventListener('click', function () {
    var name = $('#extName').value.trim();
    var email = $('#extEmail').value.trim();
    var phone = $('#extPhone').value.trim();
    if (!name) { $('#extName').focus(); return; }
    formAttendees.push({ type: 'ext', name: name, email: email, phone: phone });
    $('#extName').value = '';
    $('#extEmail').value = '';
    $('#extPhone').value = '';
    renderAttChips();
  });

  /* ---------- Detalle del evento ---------- */
  function avatarHtml(p, name) {
    if (p && p.photo) return '<img class="avatar" src="' + esc(p.photo) + '" alt="">';
    return '<span class="avatar">' + esc(initials(name)) + '</span>';
  }
  function openDetail(id) {
    var ev = events.find(function (x) { return x.id === id; });
    if (!ev) return;
    detailId = id;
    disarmDelete();
    $('#dName').textContent = ev.name;
    $('#dWhen').textContent = fmtFechaLarga(fromISO(ev.date)) + ' · ' + ev.start + (ev.end ? ' – ' + ev.end : '');
    $('#dPlace').textContent = ev.place ? 'Lugar: ' + ev.place : '';
    var box = $('#dAttendees');
    if (!ev.attendees.length) {
      box.innerHTML = '<p class="noev">Sin asistentes.</p>';
    } else {
      box.innerHTML = ev.attendees.map(function (a, i) {
        var p = a.type === 'repo' ? BY_KEY[a.key] : null;
        var name = a.type === 'repo' ? (p ? p.name : a.key) : a.name;
        var meta = p ? (p.title || '') + (p.org ? ' · ' + p.org : '')
          : [a.email, a.phone].filter(Boolean).join(' · ');
        return '<button type="button" class="attrow" data-i="' + i + '">' +
          avatarHtml(p, name) +
          '<span class="attinfo"><span class="attname">' + esc(name) + '</span>' +
          (meta ? '<span class="attmeta">' + esc(meta) + '</span>' : '') + '</span>' +
          '<span class="attgo">›</span></button>';
      }).join('');
      box.querySelectorAll('.attrow').forEach(function (b) {
        b.addEventListener('click', function () { openProfile(ev.attendees[+b.dataset.i]); });
      });
    }
    $('#detailOverlay').hidden = false;
  }
  function closeDetail() { $('#detailOverlay').hidden = true; disarmDelete(); }
  $('#detailClose').addEventListener('click', closeDetail);
  $('#dEdit').addEventListener('click', function () {
    var ev = events.find(function (x) { return x.id === detailId; });
    closeDetail();
    if (ev) openForm(ev);
  });
  var deleteArmed = false;
  function disarmDelete() {
    deleteArmed = false;
    var b = $('#dDelete');
    if (b) { b.textContent = 'Eliminar evento'; b.classList.remove('armed'); }
  }
  $('#dDelete').addEventListener('click', function () {
    var ev = events.find(function (x) { return x.id === detailId; });
    if (!ev) return;
    if (!deleteArmed) {
      deleteArmed = true;
      var b = $('#dDelete');
      b.textContent = '¿Seguro? Toca de nuevo para eliminar';
      b.classList.add('armed');
      return;
    }
    events = events.filter(function (x) { return x.id !== detailId; });
    saveEvents(events);
    disarmDelete();
    closeDetail();
    renderWeek();
  });

  /* ---------- Perfil del asistente ---------- */
  function contactLink(v) {
    if (/@/.test(v)) return '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>';
    if (/^\+?[\d\s().-]{7,}$/.test(v)) return '<a href="tel:' + esc(v.replace(/[\s().-]/g, '')) + '">' + esc(v) + '</a>';
    return esc(v);
  }
  function openProfile(a) {
    var body = $('#pBody');
    if (a.type === 'ext') {
      $('#pName').textContent = a.name || 'Persona externa';
      var rows = '';
      if (a.email) rows += '<li><span class="ck">Correo</span>' + contactLink(a.email) + '</li>';
      if (a.phone) rows += '<li><span class="ck">Teléfono</span>' + contactLink(a.phone) + '</li>';
      body.innerHTML = '<span class="avatar">' + esc(initials(a.name || '?')) + '</span>' +
        '<p class="ptitle">Invitado externo</p>' +
        '<p class="porg">Sin perfil en el Repositorio</p>' +
        (rows ? '<ul class="pcontacts">' + rows + '</ul>' : '<p class="nobio">Sin datos de contacto.</p>');
      $('#profileOverlay').hidden = false;
      return;
    }
    var p = BY_KEY[a.key];
    if (!p) { return; }
    $('#pName').textContent = p.name;
    var contacts = (typeof CONTACTOS_EX !== 'undefined' && CONTACTOS_EX[p.id]) || [];
    var crows = contacts.map(function (c) {
      return '<li><span class="ck">' + esc(c.k) + '</span>' + contactLink(c.v) + '</li>';
    }).join('');
    body.innerHTML = avatarHtml(p, p.name) +
      '<p class="ptitle">' + esc(p.title || '') + '</p>' +
      '<p class="porg">' + esc([p.org, p.dep].filter(Boolean).join(' · ')) + '</p>' +
      (p.es ? '<p class="pbio">' + esc(p.es) + '</p>' : '<p class="nobio">Sin biografía en el Repositorio.</p>') +
      (crows ? '<ul class="pcontacts">' + crows + '</ul>' : '<p class="nobio">Sin datos de contacto en el Repositorio.</p>');
    $('#profileOverlay').hidden = false;
  }
  $('#profileClose').addEventListener('click', function () { $('#profileOverlay').hidden = true; });

  /* ---------- Navegación de semana ---------- */
  $('#prevW').addEventListener('click', function () {
    weekStart.setDate(weekStart.getDate() - 7);
    renderWeek();
  });
  $('#nextW').addEventListener('click', function () {
    weekStart.setDate(weekStart.getDate() + 7);
    renderWeek();
  });
  $('#todayBtn').addEventListener('click', function () {
    weekStart = mondayOf(new Date());
    renderWeek();
  });
  $('#fab').addEventListener('click', function () { openForm(null); });

  /* Cerrar hojas tocando fuera de ellas */
  document.querySelectorAll('.overlay').forEach(function (ov) {
    ov.addEventListener('click', function (e) {
      if (e.target === ov) ov.hidden = true;
    });
  });

  renderWeek();
})();
