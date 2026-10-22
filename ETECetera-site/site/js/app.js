/* ETECetera — comportamento do site (menu, busca, páginas, títulos em letras recortadas).
   Os textos e as informações do jornal ficam em js/dados.js. */
(function () {
  'use strict';

  var J = window.JORNAL;
  if (!J) { return; }

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pagina = document.body.getAttribute('data-pagina') || 'inicio';
  var params = new URLSearchParams(location.search);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (html != null) { e.innerHTML = html; }
    return e;
  }
  function listaDeNomes(arr) {
    if (arr.length <= 1) { return arr.join(''); }
    return arr.slice(0, -1).join(', ') + ' e ' + arr[arr.length - 1];
  }

  /* ---------- dados ---------- */
  var SEC = {};
  J.secoes.forEach(function (s) { SEC[s.id] = s.nome; });
  var edicoes = J.edicoes.slice().sort(function (a, b) { return b.numero - a.numero; });
  var todas = [];
  edicoes.forEach(function (e) {
    e.materias.forEach(function (m) { m.edicao = e.numero; m.edicaoData = e.data; todas.push(m); });
  });
  function acharMateria(id) { return todas.filter(function (m) { return m.id === id; })[0]; }
  function acharEdicao(n) { return edicoes.filter(function (e) { return String(e.numero) === String(n); })[0]; }
  var edicaoAtual = acharEdicao(params.get('edicao')) || edicoes.filter(function (e) { return e.atual; })[0] || edicoes[0];

  /* ---------- texto sem acento e sem maiúscula (para a busca) ---------- */
  function dobrar(s) {
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      var d = ch.normalize('NFD').charAt(0).toLowerCase();
      out += d.length === 1 ? d : ch;
    }
    return out;
  }

  /* ---------- pincéis e rabiscos (SVG) ---------- */
  var SPRITE =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    '<filter id="aspero" x="-8%" y="-8%" width="116%" height="116%">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.03 0.08" numOctaves="3" seed="7" result="r"/>' +
    '<feDisplacementMap in="SourceGraphic" in2="r" scale="16" result="d"/>' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.015 0.55" numOctaves="2" seed="3" result="f"/>' +
    '<feColorMatrix in="f" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 7 -2.1" result="m"/>' +
    '<feComposite in="d" in2="m" operator="in"/></filter>' +
    '<symbol id="pincel-a" viewBox="0 0 400 200"><g filter="url(#aspero)"><path d="M18 120 C70 40 150 170 220 100 S340 60 382 92" stroke="currentColor" stroke-width="70" stroke-linecap="round" fill="none"/></g></symbol>' +
    '<symbol id="pincel-b" viewBox="0 0 400 200"><g filter="url(#aspero)"><path d="M24 70 C120 20 160 150 250 118 S350 150 380 138" stroke="currentColor" stroke-width="58" stroke-linecap="round" fill="none"/><path d="M30 162 C120 130 210 190 372 104" stroke="currentColor" stroke-width="18" stroke-linecap="round" fill="none"/></g></symbol>' +
    '<symbol id="pincel-c" viewBox="0 0 400 200"><g filter="url(#aspero)"><path d="M70 40 C160 0 300 10 350 80 S330 190 200 180 S20 140 70 40Z" fill="currentColor"/></g></symbol>' +
    '<symbol id="rabisco" viewBox="0 0 400 200"><path d="M10 100 C40 20 70 20 60 90 S100 170 130 80 S170 10 190 90 S240 160 260 80 S300 20 330 100 S370 150 390 70" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></symbol>' +
    '<symbol id="pontos" viewBox="0 0 200 120"><g fill="currentColor"><circle cx="30" cy="30" r="20"/><circle cx="86" cy="64" r="26"/><circle cx="150" cy="30" r="16"/><circle cx="160" cy="92" r="22"/><circle cx="44" cy="96" r="12"/></g></symbol>' +
    '</defs></svg>';

  function pincel(tipo, classe, cor) {
    var s = el('div', 'pincel ' + classe);
    s.style.color = cor;
    s.innerHTML = '<svg viewBox="0 0 400 200" width="100%" aria-hidden="true" focusable="false"><use href="#' + tipo + '"/></svg>';
    return s;
  }

  /* ---------- títulos em letras recortadas ---------- */
  var FONTES = [
    ['"Abril Fatface", Georgia, serif', 400, 'normal'],
    ['"Alfa Slab One", Georgia, serif', 400, 'normal'],
    ['"Bevan", Georgia, serif', 400, 'normal'],
    ['"Playfair Display", Georgia, serif', 900, 'italic'],
    ['"DM Serif Display", Georgia, serif', 400, 'normal'],
    ['"Special Elite", "Courier New", monospace', 400, 'normal']
  ];
  var PAPEIS = [
    ['#FCF7F4', '#22244A'], ['#FFFFFF', '#3D46A5'], ['#AC3632', '#FCF7F4'], ['#3D46A5', '#FCF7F4'],
    ['#F0BD61', '#22244A'], ['#B6C7E0', '#22244A'], ['#22244A', '#F0BD61'], ['#FCF7F4', '#AC3632']
  ];
  function semente(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function sorteio(seed) {
    var a = seed;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function recorte(r) {
    var p = function (n) { return (r() * n).toFixed(1) + '%'; };
    var q = function (n) { return (100 - r() * n).toFixed(1) + '%'; };
    var m = function () { return (46 + r() * 8).toFixed(1) + '%'; };
    return 'polygon(' + [p(7) + ' ' + p(9), m() + ' ' + p(5), q(7) + ' ' + p(8), q(5) + ' ' + m(), q(7) + ' ' + q(9),
      m() + ' ' + q(5), p(7) + ' ' + q(8), p(5) + ' ' + m()].join(',') + ')';
  }
  function recortar(alvo) {
    var texto = alvo.textContent.replace(/\s+/g, ' ').trim();
    var r = sorteio(semente(texto));
    alvo.setAttribute('aria-label', texto);
    alvo.classList.add('recorte-titulo');
    alvo.textContent = '';
    var ultimaFonte = -1, ultimoPapel = -1, n = 0;
    texto.split(' ').forEach(function (palavra) {
      var w = el('span', 'palavra');
      w.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(palavra, function (ch) {
        var f, pp;
        do { f = Math.floor(r() * FONTES.length); } while (f === ultimaFonte);
        do { pp = Math.floor(r() * PAPEIS.length); } while (pp === ultimoPapel);
        ultimaFonte = f; ultimoPapel = pp;
        var s = el('span', 'letra');
        s.textContent = ch;
        s.style.cssText = '--f:' + FONTES[f][0] + ';--w:' + FONTES[f][1] + ';--s:' + FONTES[f][2] +
          ';--bg:' + PAPEIS[pp][0] + ';--fg:' + PAPEIS[pp][1] +
          ';--r:' + ((r() - 0.5) * 9).toFixed(1) + 'deg;--y:' + ((r() - 0.5) * 0.12).toFixed(3) + 'em;--i:' + n +
          ';--clip:' + recorte(r);
        n++;
        w.appendChild(s);
      });
      alvo.appendChild(w);
      alvo.appendChild(document.createTextNode(' '));
    });
  }
  function recortarTodos() { $$('[data-recorte]').forEach(recortar); }

  /* ---------- foto com efeito de adesivo ---------- */
  function foto(opc) {
    var f = el('figure', 'foto' + (opc.classe ? ' ' + opc.classe : ''));
    var img = new Image();
    img.alt = opc.alt || '';
    img.decoding = 'async';
    if (opc.preguica) { img.loading = 'lazy'; }
    img.addEventListener('error', function () {
      if (opc.esconderSeFalta) { f.remove(); return; }
      f.classList.add('sem-foto');
      var t = el('span', 'sem-foto__texto');
      t.textContent = opc.texto || ('Foto aqui: ' + opc.src);
      f.appendChild(t);
    });
    img.src = opc.src;
    f.appendChild(img);
    if (opc.legenda) { var c = el('figcaption'); c.textContent = opc.legenda; f.appendChild(c); }
    return f;
  }

  /* ---------- cabeçalho, menu e rodapé ---------- */
  var ICONE_LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>';
  var paginas = [
    { id: 'inicio', nome: 'Início', href: 'index.html' },
    { id: 'secoes', nome: 'Seções' },
    { id: 'repositorio', nome: 'Repositório', href: 'repositorio.html' },
    { id: 'sobre', nome: 'Sobre nós', href: 'sobre.html' },
    { id: 'creditos', nome: 'Créditos', href: 'creditos.html' }
  ];

  function logoHtml() {
    return '<a class="logo" href="index.html" aria-label="' + esc(J.site.nome) + ', página inicial">' +
      '<img src="' + esc(J.site.logo) + '" alt="" height="52" onerror="this.parentNode.innerHTML=\'<span class=&quot;logo__texto&quot; aria-hidden=&quot;true&quot;><b>etec</b><i>étera</i></span>\'">' +
      '</a>';
  }

  function montarCabecalho() {
    var ed = edicaoAtual;
    var itens = paginas.map(function (p) {
      if (p.id === 'secoes') {
        var subs = J.secoes.map(function (s) {
          return '<li><a href="index.html?secao=' + s.id + '#pautas" data-secao="' + s.id + '">' + esc(s.nome) + '</a></li>';
        }).join('');
        return '<li><button type="button" class="menu__botao" aria-expanded="false" aria-controls="submenu">Seções</button>' +
          '<ul class="sub" id="submenu">' + subs + '</ul></li>';
      }
      var atual = p.id === pagina ? ' aria-current="page"' : '';
      return '<li><a href="' + p.href + '"' + atual + '>' + p.nome + '</a></li>';
    }).join('');

    var topo = '<a class="pular" href="#conteudo">Ir para o conteúdo</a>' +
      '<div class="faixa"><span>Edição nº ' + ed.numero + '</span><span>' + esc(ed.data) + '</span></div>' +
      '<header class="topo"><div class="miolo"><div class="topo__linha">' + logoHtml() +
      '<button type="button" class="lupa" id="abrir-busca" aria-label="Buscar nas pautas" aria-haspopup="dialog">' + ICONE_LUPA + '</button>' +
      '<button type="button" class="menu-botao" id="menu-botao" aria-expanded="false" aria-controls="nav">Menu</button>' +
      '<nav class="nav" id="nav" aria-label="Principal"><ul class="menu">' + itens + '</ul>' +
      '<a class="participe" href="creditos.html#contato">Participe</a></nav>' +
      '</div></div></header>';
    document.body.insertAdjacentHTML('afterbegin', SPRITE + topo);

    var botao = $('#menu-botao'), nav = $('#nav');
    botao.addEventListener('click', function () {
      var aberto = nav.classList.toggle('aberto');
      botao.setAttribute('aria-expanded', aberto);
    });
    var secBotao = $('.menu__botao'), sub = $('#submenu');
    secBotao.addEventListener('click', function (e) {
      e.stopPropagation();
      var aberto = sub.classList.toggle('aberto');
      secBotao.setAttribute('aria-expanded', aberto);
    });
    document.addEventListener('click', function (e) {
      if (!sub.contains(e.target) && e.target !== secBotao) { sub.classList.remove('aberto'); secBotao.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sub.classList.contains('aberto')) { sub.classList.remove('aberto'); secBotao.setAttribute('aria-expanded', 'false'); secBotao.focus(); }
    });
  }

  function montarRodape() {
    var s = J.site;
    var contato = s.email ? '<li><a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></li>' : '';
    var insta = s.instagram ? '<li><a href="' + esc(s.instagram) + '" rel="noopener">Instagram</a></li>' : '';
    var html = '<footer class="rodape"><div class="miolo"><div class="rodape__grade">' +
      '<div><h2>' + esc(s.nome) + '</h2><p class="rodape__lema">' + esc(s.lema) + '</p></div>' +
      '<div><h2>Navegue</h2><ul><li><a href="index.html">Início</a></li><li><a href="repositorio.html">Repositório</a></li>' +
      '<li><a href="sobre.html">Sobre nós</a></li><li><a href="creditos.html">Créditos</a></li></ul></div>' +
      '<div><h2>Fale com a gente</h2><ul>' + contato + insta + '<li><a href="creditos.html#contato">Participe das próximas edições</a></li></ul></div>' +
      '</div><p class="rodape__fim">' + esc(s.nome) + ', Mongaguá. Textos e fotos feitos por estudantes da ETEC Adolpho Berezin.</p></div></footer>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  /* ---------- busca ---------- */
  var INDICE = todas.map(function (m) {
    var corpo = m.corpo.map(function (b) { return b.x; }).join('\n');
    var extra = (m.contatos || []).map(function (c) { return c.nome + ' ' + c.produto; }).join(' ');
    return {
      m: m, corpoOrig: corpo,
      titulo: dobrar(m.titulo), sub: dobrar(m.subtitulo || ''), aut: dobrar(m.autores.join(', ')),
      sec: dobrar(SEC[m.secao] || ''), cham: dobrar(m.chamada || ''), corpo: dobrar(corpo), extra: dobrar(extra)
    };
  });

  function termosDe(q) {
    return dobrar(q).split(/\s+/).filter(function (t) { return t.length >= 2; });
  }
  function marcar(texto, termos) {
    var f = dobrar(texto), faixas = [];
    termos.forEach(function (t) {
      var i = f.indexOf(t);
      while (i !== -1) { faixas.push([i, i + t.length]); i = f.indexOf(t, i + t.length); }
    });
    faixas.sort(function (a, b) { return a[0] - b[0]; });
    var mescla = [];
    faixas.forEach(function (x) {
      var u = mescla[mescla.length - 1];
      if (u && x[0] <= u[1]) { u[1] = Math.max(u[1], x[1]); } else { mescla.push(x.slice()); }
    });
    var out = '', pos = 0;
    mescla.forEach(function (x) {
      out += esc(texto.slice(pos, x[0])) + '<mark>' + esc(texto.slice(x[0], x[1])) + '</mark>';
      pos = x[1];
    });
    return out + esc(texto.slice(pos));
  }
  function buscar(q) {
    var termos = termosDe(q);
    if (!termos.length) { return { termos: termos, itens: [] }; }
    var itens = [];
    INDICE.forEach(function (e) {
      var tudo = e.titulo + '\n' + e.sub + '\n' + e.aut + '\n' + e.sec + '\n' + e.cham + '\n' + e.corpo + '\n' + e.extra;
      var ok = termos.every(function (t) { return tudo.indexOf(t) !== -1; });
      if (!ok) { return; }
      var pontos = 0;
      termos.forEach(function (t) {
        if (e.titulo.indexOf(t) !== -1) { pontos += 10; }
        if (e.aut.indexOf(t) !== -1) { pontos += 6; }
        if (e.sub.indexOf(t) !== -1 || e.sec.indexOf(t) !== -1) { pontos += 4; }
        if (e.cham.indexOf(t) !== -1) { pontos += 3; }
        var n = e.corpo.split(t).length - 1;
        pontos += Math.min(n, 8);
      });
      var trecho = '';
      var pos = -1;
      for (var k = 0; k < termos.length && pos === -1; k++) { pos = e.corpo.indexOf(termos[k]); }
      if (pos !== -1) {
        var ini = Math.max(0, pos - 60), fim = Math.min(e.corpoOrig.length, pos + 110);
        trecho = (ini > 0 ? '…' : '') + e.corpoOrig.slice(ini, fim).replace(/\s/g, ' ') + (fim < e.corpoOrig.length ? '…' : '');
      } else if (e.aut.indexOf(termos[0]) !== -1) {
        trecho = 'Por ' + listaDeNomes(e.m.autores);
      } else {
        trecho = e.m.chamada;
      }
      itens.push({ e: e, pontos: pontos, trecho: trecho });
    });
    itens.sort(function (a, b) { return b.pontos - a.pontos; });
    return { termos: termos, itens: itens.slice(0, 20) };
  }

  function montarBusca() {
    var html = '<div class="busca" id="busca" role="dialog" aria-modal="true" aria-labelledby="busca-titulo">' +
      '<div class="busca__moldura"><div class="busca__painel">' +
      '<div class="busca__topo"><h2 class="busca__titulo" id="busca-titulo">Buscar nas pautas</h2>' +
      '<button type="button" class="busca__fechar" id="busca-fechar">Fechar</button></div>' +
      '<form id="busca-form" role="search" autocomplete="off"><label class="so-leitor" for="busca-campo">Palavra, nome ou assunto</label>' +
      '<input class="busca__campo" id="busca-campo" type="search" placeholder="Digite uma palavra, um nome ou um assunto" enterkeyhint="search"></form>' +
      '<p class="busca__estado" id="busca-estado" aria-live="polite"></p>' +
      '<ul class="busca__lista" id="busca-lista"></ul>' +
      '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);

    var caixa = $('#busca'), campo = $('#busca-campo'), estado = $('#busca-estado'), lista = $('#busca-lista');
    var abrir = $('#abrir-busca'), fechar = $('#busca-fechar');
    var timer;

    function mostrar() {
      var q = campo.value.trim();
      lista.innerHTML = '';
      if (q.length < 2) { estado.textContent = q.length ? 'Digite pelo menos 2 letras.' : 'Procura nos títulos, nos autores e em todo o texto das pautas.'; return; }
      var r = buscar(q);
      if (!r.itens.length) {
        estado.textContent = 'Nenhuma pauta tem “' + q + '”. Tente outra palavra, como o nome de um evento ou de uma pessoa.';
        return;
      }
      estado.textContent = r.itens.length + (r.itens.length === 1 ? ' pauta encontrada.' : ' pautas encontradas.');
      r.itens.forEach(function (it) {
        var m = it.e.m;
        var li = el('li');
        var a = el('a', null,
          '<strong>' + marcar(m.titulo, r.termos) + '</strong>' +
          '<span class="busca__origem"><span>' + esc(SEC[m.secao] || '') + '</span><span>Edição nº ' + m.edicao + '</span></span>' +
          '<span class="busca__trecho">' + marcar(it.trecho, r.termos) + '</span>');
        a.href = 'materia.html?id=' + encodeURIComponent(m.id) + '&q=' + encodeURIComponent(q);
        a.setAttribute('data-secao', m.secao);
        a.style.setProperty('--cor', 'var(--' + ({ cultura: 'vermelho', esportes: 'azul', politica: 'ceu', empreendedores: 'sol', escola: 'tinta-suave', entretenimento: 'tinta' }[m.secao] || 'azul') + ')');
        li.appendChild(a);
        lista.appendChild(li);
      });
    }
    function abrirBusca() {
      caixa.classList.add('aberta');
      document.body.style.overflow = 'hidden';
      mostrar();
      campo.focus();
    }
    function fecharBusca() {
      caixa.classList.remove('aberta');
      document.body.style.overflow = '';
      abrir.focus();
    }
    abrir.addEventListener('click', abrirBusca);
    fechar.addEventListener('click', fecharBusca);
    caixa.addEventListener('mousedown', function (e) { if (e.target === caixa) { fecharBusca(); } });
    campo.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(mostrar, 90); });
    $('#busca-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var primeiro = $('a', lista);
      if (primeiro) { location.href = primeiro.href; }
    });
    document.addEventListener('keydown', function (e) {
      if (!caixa.classList.contains('aberta')) { return; }
      if (e.key === 'Escape') { fecharBusca(); return; }
      if (e.key === 'Tab') {
        var foc = $$('button, input, a[href]', caixa);
        var p = foc[0], u = foc[foc.length - 1];
        if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); }
        else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); }
      }
    });
  }

  /* ---------- página inicial ---------- */
  var SPANS = [7, 5, 4, 4, 4, 5, 7, 4, 4, 4, 6, 6, 12];
  var GIROS = [-.8, .7, -.5, 1, -1, .6, -.7, .9, -.6, .5, -.9, .8, -.4];
  var PINCEIS = [['pincel-a', 'var(--vermelho)'], ['pincel-b', 'var(--sol)'], ['pincel-c', 'var(--azul)'], ['pincel-a', 'var(--ceu)'], ['pincel-b', 'var(--vermelho)'], ['pincel-c', 'var(--sol)']];

  function minutos(m) { return m.minutos + ' min de leitura'; }

  function montarInicio() {
    var ed = edicaoAtual;
    var d = ed.destaque || {};
    var mDest = acharMateria(d.materia) || ed.materias[0];
    var capa = $('#capa');
    capa.innerHTML = '';
    var texto = el('div', 'capa__texto');
    var h1 = el('h1', 'manchete');
    h1.setAttribute('data-recorte', '');
    h1.textContent = d.titulo || mDest.titulo;
    texto.appendChild(h1);
    texto.appendChild(el('p', 'capa__linha-fina', esc(d.linhaFina || mDest.chamada)));
    texto.appendChild(el('p', 'capa__autoria', 'Por ' + esc(listaDeNomes(mDest.autores)) + ', ' + minutos(mDest)));
    var link = el('a', 'botao', 'Ler a matéria');
    link.href = 'materia.html?id=' + encodeURIComponent(mDest.id);
    texto.appendChild(link);

    var palco = el('div', 'capa__palco');
    palco.appendChild(pincel('pincel-a', 'pincel-1', 'var(--vermelho)'));
    palco.appendChild(pincel('pincel-b', 'pincel-2', 'var(--sol)'));
    palco.appendChild(pincel('pincel-c', 'pincel-3', 'var(--azul)'));
    palco.appendChild(pincel('rabisco', 'rabisco', 'var(--azul)'));
    palco.appendChild(pincel('pontos', 'pontos', 'var(--sol)'));
    palco.appendChild(foto({ src: mDest.imagem, alt: 'Foto da matéria: ' + mDest.titulo, texto: 'Foto da manchete: ' + mDest.imagem }));
    capa.appendChild(texto);
    capa.appendChild(palco);

    /* filtros e cartões */
    var grade = $('#grade'), filtros = $('#filtros'), estado = $('#filtros-estado');
    var contagem = {};
    ed.materias.forEach(function (m) { contagem[m.secao] = (contagem[m.secao] || 0) + 1; });
    var botoes = [{ id: 'todas', nome: 'Todas as pautas', n: ed.materias.length }].concat(
      J.secoes.filter(function (s) { return contagem[s.id]; }).map(function (s) { return { id: s.id, nome: s.nome, n: contagem[s.id] }; }));
    botoes.forEach(function (b) {
      var bt = el('button', 'filtro', esc(b.nome) + '<small>' + b.n + '</small>');
      bt.type = 'button';
      bt.setAttribute('data-filtro', b.id);
      bt.setAttribute('aria-pressed', 'false');
      filtros.appendChild(bt);
    });

    ed.materias.forEach(function (m, i) {
      var c = el('article', 'cartao papel-' + (i % 4) + ' t-' + SPANS[i % SPANS.length]);
      c.setAttribute('data-secao', m.secao);
      c.style.setProperty('--giro', GIROS[i % GIROS.length] + 'deg');
      var a = el('a', 'cartao__link');
      a.href = 'materia.html?id=' + encodeURIComponent(m.id);
      var pal = el('div', 'cartao__palco');
      var pp = PINCEIS[i % PINCEIS.length];
      pal.appendChild(pincel(pp[0], 'pincel', pp[1]));
      pal.appendChild(foto({ src: m.imagem, alt: '', preguica: true, texto: 'Foto aqui: ' + m.imagem }));
      var mold = el('div', 'cartao__moldura');
      var papel = el('div', 'cartao__papel',
        '<span class="cartao__secao">' + esc(SEC[m.secao] || '') + '</span>' +
        '<h3 class="cartao__titulo">' + esc(m.titulo) + '</h3>' +
        '<p class="cartao__chamada">' + esc(m.chamada) + '</p>' +
        '<p class="cartao__autores">Por ' + esc(listaDeNomes(m.autores)) + '</p>');
      mold.appendChild(papel);
      a.appendChild(pal); a.appendChild(mold);
      c.appendChild(a);
      c.appendChild(el('span', 'cartao__fita'));
      grade.appendChild(c);
    });

    function filtrar(id, atualizarUrl) {
      var n = 0;
      $$('.cartao', grade).forEach(function (c) {
        var mostrar = id === 'todas' || c.getAttribute('data-secao') === id;
        c.classList.toggle('some', !mostrar);
        if (mostrar) { n++; }
      });
      grade.classList.toggle('filtrada', id !== 'todas');
      $$('.filtro', filtros).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-filtro') === id ? 'true' : 'false'); });
      estado.textContent = id === 'todas' ? '' : 'Mostrando ' + n + (n === 1 ? ' pauta' : ' pautas') + ' de ' + (SEC[id] || '') + '.';
      if (atualizarUrl) {
        var u = new URL(location.href);
        if (id === 'todas') { u.searchParams.delete('secao'); } else { u.searchParams.set('secao', id); }
        history.replaceState(null, '', u.toString());
      }
    }
    filtros.addEventListener('click', function (e) {
      var b = e.target.closest('.filtro');
      if (b) { filtrar(b.getAttribute('data-filtro'), true); }
    });
    var inicial = params.get('secao');
    filtrar(inicial && contagem[inicial] ? inicial : 'todas', false);
  }

  /* ---------- matéria ---------- */
  function destacarNoTexto(raiz, termos) {
    if (!termos.length) { return; }
    var andador = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null);
    var nos = [], n;
    while ((n = andador.nextNode())) { nos.push(n); }
    nos.forEach(function (no) {
      var t = no.nodeValue;
      var html = marcar(t, termos);
      if (html.indexOf('<mark>') === -1) { return; }
      var s = document.createElement('span');
      s.innerHTML = html;
      no.parentNode.replaceChild(s, no);
    });
  }

  function montarMateria() {
    var area = $('#materia');
    var m = acharMateria(params.get('id'));
    if (!m) {
      area.innerHTML = '<div class="miolo"><div class="pagina"><h1 class="materia__titulo">Não achamos essa pauta</h1>' +
        '<p>O endereço pode estar incompleto. <a href="index.html#pautas">Veja todas as pautas da edição.</a></p></div></div>';
      return;
    }
    document.title = m.titulo + ' | ' + J.site.nome;
    var desc = $('meta[name="description"]');
    if (desc) { desc.setAttribute('content', m.chamada); }

    var secao = SEC[m.secao] || '';
    var cab = el('div', 'miolo');
    var corpoHtml = document.createDocumentFragment();

    var i = todas.indexOf(m);
    var ant = todas[i - 1], prox = todas[i + 1];

    var topo = el('div', 'materia__cabeca',
      '<a class="voltar" href="index.html#pautas">Voltar às pautas</a><br>' +
      '<span class="cartao__secao" data-secao="' + m.secao + '">' + esc(secao) + '</span>' +
      '<h1 class="materia__titulo">' + esc(m.titulo) + '</h1>' +
      (m.subtitulo ? '<p class="materia__sub">' + esc(m.subtitulo) + '</p>' : '') +
      '<p class="materia__meta"><span><strong>Por ' + esc(listaDeNomes(m.autores)) + '</strong></span>' +
      '<span>Edição nº ' + m.edicao + ', ' + esc(m.edicaoData) + '</span><span>' + minutos(m) + '</span></p>');
    var comp = el('button', 'compartilhar', 'Compartilhar');
    comp.type = 'button';
    comp.style.marginTop = '1rem';
    comp.addEventListener('click', function () {
      var url = location.href.split('&q=')[0];
      if (navigator.share) { navigator.share({ title: m.titulo, text: m.chamada, url: url }).catch(function () {}); }
      else { window.open('https://wa.me/?text=' + encodeURIComponent(m.titulo + ' ' + url), '_blank', 'noopener'); }
    });
    topo.appendChild(comp);
    cab.appendChild(topo);

    var palco = el('div', 'materia__palco');
    palco.appendChild(pincel('pincel-a', 'pincel-1', 'var(--sol)'));
    palco.appendChild(pincel('pincel-b', 'pincel-2', 'var(--ceu)'));
    palco.appendChild(foto({ src: m.imagem, alt: 'Foto da matéria: ' + m.titulo, texto: 'Foto da matéria: ' + m.imagem }));
    cab.appendChild(palco);

    var leitura = el('div', 'leitura folha-moldura');
    var folha = el('div', 'folha texto-leitura');
    var fotosInseridas = !(m.fotos && m.fotos.length);
    m.corpo.forEach(function (b, k) {
      if (!fotosInseridas && (b.t === 'q' || k === 3)) {
        fotosInseridas = true;
        var grupo = el('div', 'fotos');
        m.fotos.forEach(function (f) { grupo.appendChild(foto({ src: f.arquivo, alt: f.legenda, legenda: f.legenda, esconderSeFalta: true, preguica: true })); });
        folha.appendChild(grupo);
      }
      var x = b.x;
      if (b.t === 'p') { folha.appendChild(el('p', null, esc(x))); }
      else if (b.t === 'q') { folha.appendChild(el('p', 'q', '<span>' + esc(x) + '</span>')); }
      else if (b.t === 'fala') { folha.appendChild(el('p', 'fala', esc(x))); }
      else if (b.t === 'h2') { folha.appendChild(el('h2', null, esc(x))); }
      else if (b.t === 'h3') { folha.appendChild(el('h3', null, esc(x))); }
      else if (b.t === 'h') {
        if (b.d) {
          var dia = el('div', 'dia', '<time>' + esc(b.d) + '</time><h3>' + esc(x) + '</h3>');
          folha.appendChild(dia);
        } else { folha.appendChild(el('h3', null, esc(x))); }
      }
      else if (b.t === 'citacao') {
        folha.appendChild(el('blockquote', 'citacao', '<p>' + esc(x) + '</p>' + (b.a ? '<footer>' + esc(b.a) + '</footer>' : '')));
      }
    });

    if (m.contatos && m.contatos.length) {
      var cont = el('section', 'contatos');
      cont.setAttribute('aria-labelledby', 'contatos-titulo');
      cont.innerHTML = '<h2 id="contatos-titulo">Fale com eles</h2>';
      var ul = el('ul', 'contatos__lista');
      m.contatos.forEach(function (c) {
        var li = el('li', 'contato');
        li.appendChild(foto({ src: c.foto, alt: c.nome, preguica: true, texto: c.nome.split(' ')[0] }));
        var dig = c.tel.replace(/\D/g, '');
        li.appendChild(el('div', null,
          '<h3>' + esc(c.nome) + '</h3><p>' + esc(c.produto) + '</p>' +
          '<p><a href="tel:+55' + dig + '">' + esc(c.tel) + '</a>, ' +
          '<a href="https://wa.me/55' + dig + '" rel="noopener">chamar no WhatsApp</a></p>'));
        ul.appendChild(li);
      });
      cont.appendChild(ul);
      folha.appendChild(cont);
    }
    leitura.appendChild(folha);
    cab.appendChild(leitura);

    var viz = el('nav', 'vizinhas');
    viz.setAttribute('aria-label', 'Outras pautas');
    if (ant) { viz.appendChild(el('a', null, '<small>Pauta anterior</small><strong>' + esc(ant.titulo) + '</strong>')).href = 'materia.html?id=' + encodeURIComponent(ant.id); }
    if (prox) { viz.appendChild(el('a', null, '<small>Próxima pauta</small><strong>' + esc(prox.titulo) + '</strong>')).href = 'materia.html?id=' + encodeURIComponent(prox.id); }
    cab.appendChild(viz);

    area.appendChild(cab);

    var q = params.get('q');
    if (q) {
      destacarNoTexto(leitura, termosDe(q));
      var primeira = $('mark', leitura);
      if (primeira) { setTimeout(function () { primeira.scrollIntoView({ block: 'center' }); }, 60); }
    }
  }

  /* ---------- repositório ---------- */
  function montarRepositorio() {
    var area = $('#edicoes');
    edicoes.forEach(function (e) {
      var d = e.destaque || {};
      var itens = e.materias.map(function (m) {
        return '<li><a href="materia.html?id=' + encodeURIComponent(m.id) + '">' + esc(m.titulo) + '</a></li>';
      }).join('');
      var s = el('article', 'edicao',
        '<div><h2>Edição nº ' + e.numero + '</h2><p class="edicao__data">' + esc(e.data) + '</p></div>' +
        '<p>' + esc(d.titulo ? 'Manchete: ' + d.titulo : '') + ' (' + e.materias.length + ' pautas)</p>' +
        '<ul class="edicao__lista">' + itens + '</ul>');
      var a = el('a', 'botao', 'Abrir a edição');
      a.href = e.atual ? 'index.html' : 'index.html?edicao=' + e.numero;
      s.appendChild(a);
      area.appendChild(s);
    });
    area.appendChild(el('article', 'edicao edicao--vazia',
      '<h2>Próxima edição</h2><p>Ela ainda está sendo escrita. Quando sair, vai aparecer aqui, junto com todas as anteriores.</p>' +
      '<p><a href="creditos.html#contato">Quer participar?</a></p>'));
  }

  /* ---------- créditos ---------- */
  function montarCreditos() {
    var mapa = {};
    todas.forEach(function (m) { m.autores.forEach(function (a) { (mapa[a] = mapa[a] || []).push(m); }); });
    var nomes = Object.keys(mapa).sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
    $('#lista-autores').innerHTML = nomes.map(function (n) {
      return '<li>' + esc(n) + '<small>' + esc(mapa[n].map(function (m) { return m.titulo.split(':')[0]; }).join('; ')) + '</small></li>';
    }).join('');
    var eq = J.equipe || {};
    $('#lista-orientacao').innerHTML = (eq.orientacao || []).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
    $('#lista-revisao').innerHTML = (eq.revisao || []).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
    var email = J.site.email;
    var alvo = $('#contato-email');
    if (email) {
      alvo.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Quero participar do ' + J.site.nome);
      alvo.textContent = email;
    } else { alvo.remove(); }
    if (J.site.instagram) {
      var p = el('p', null, '<a href="' + esc(J.site.instagram) + '" rel="noopener">Siga o jornal no Instagram</a>');
      $('#contato').appendChild(p);
    }
  }

  /* ---------- início ---------- */
  montarCabecalho();
  montarRodape();
  montarBusca();
  if (pagina === 'inicio') { montarInicio(); }
  if (pagina === 'materia') { montarMateria(); }
  if (pagina === 'repositorio') { montarRepositorio(); }
  if (pagina === 'creditos') { montarCreditos(); }
  recortarTodos();
  if (location.hash && pagina !== 'materia') {
    var alvoHash = document.getElementById(location.hash.slice(1));
    if (alvoHash) { alvoHash.scrollIntoView(); }
  }
})();
