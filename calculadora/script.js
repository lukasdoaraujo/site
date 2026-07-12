/* ==========================================================================
   Calculadora Corporal — Lukas Capetinga / Arquitetura Corporal
   Cálculos: composição (Navy Method métrico), IMC, TMB (Mifflin-St Jeor),
   GCT, massa magra/gorda, RCQ, macros por objetivo, proteína, água e simetria.
   ========================================================================== */
(function () {
  "use strict";

  var form = document.getElementById('calcForm');
  var results = document.getElementById('results');
  var sexoSel = document.getElementById('sexo');
  var quadrilField = document.getElementById('field-quadril');
  var quadrilInput = document.getElementById('quadril');

  /* ---------- Helpers de formatação (pt-BR) ---------- */
  function num(id) {
    var el = document.getElementById(id);
    if (!el) return NaN;
    var v = parseFloat(String(el.value).replace(',', '.'));
    return isNaN(v) ? NaN : v;
  }
  function intBR(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function dec1(n) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function set(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  function setClass(id, txt, cls) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = txt;
    el.className = el.className.replace(/\b(ok|warn|bad)\b/g, '').trim();
    if (cls) el.classList.add(cls);
  }

  /* ---------- Quadril: obrigatório para mulheres, opcional para homens ---------- */
  function toggleQuadril() {
    var f = sexoSel.value === 'F';
    quadrilInput.required = f;
    var req = document.getElementById('quadril-req');
    if (req) req.style.display = f ? '' : 'none';
    var hint = document.getElementById('quadril-hint');
    if (hint) hint.textContent = f
      ? 'Na parte mais larga dos glúteos. Obrigatório para mulheres.'
      : 'Na parte mais larga dos glúteos. Opcional — habilita a relação cintura/quadril.';
  }
  sexoSel.addEventListener('change', toggleQuadril);
  toggleQuadril();

  /* ---------- Seções opcionais (dobras, simetria) ---------- */
  document.querySelectorAll('.optional').forEach(function (opt) {
    var head = opt.querySelector('.optional-head');
    if (!head) return;
    head.addEventListener('click', function () {
      var open = opt.classList.toggle('open');
      head.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- Limpar erro ao digitar ---------- */
  form.addEventListener('input', function (e) {
    var f = e.target.closest('.field');
    if (f) f.classList.remove('invalid');
  });

  /* ---------- Validação ---------- */
  function validate() {
    var required = ['sexo', 'idade', 'peso', 'altura', 'atividade', 'pescoco', 'cintura'];
    if (sexoSel.value === 'F') required.push('quadril');
    var firstBad = null;

    required.forEach(function (id) {
      var el = document.getElementById(id);
      var field = el.closest('.field');
      var ok;
      if (el.tagName === 'SELECT') ok = !!el.value;
      else { var v = parseFloat(String(el.value).replace(',', '.')); ok = !isNaN(v) && v > 0; }
      if (!ok) { field.classList.add('invalid'); if (!firstBad) firstBad = field; }
    });

    if (firstBad) firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return !firstBad;
  }

  /* ---------- Classificações ---------- */
  function classIMC(imc) {
    if (imc < 18.5) return { t: 'Abaixo do peso', c: 'warn' };
    if (imc < 25) return { t: 'Peso normal', c: 'ok' };
    if (imc < 30) return { t: 'Sobrepeso', c: 'warn' };
    if (imc < 35) return { t: 'Obesidade I', c: 'bad' };
    if (imc < 40) return { t: 'Obesidade II', c: 'bad' };
    return { t: 'Obesidade III', c: 'bad' };
  }
  function classBF(bf, sexo) {
    var f = sexo === 'F';
    if (f) {
      if (bf < 14) return { t: 'Essencial / muito baixo', c: 'warn' };
      if (bf < 21) return { t: 'Atlético', c: 'ok' };
      if (bf < 25) return { t: 'Fitness', c: 'ok' };
      if (bf < 32) return { t: 'Aceitável', c: 'warn' };
      return { t: 'Elevado', c: 'bad' };
    }
    if (bf < 6) return { t: 'Essencial / muito baixo', c: 'warn' };
    if (bf < 14) return { t: 'Atlético', c: 'ok' };
    if (bf < 18) return { t: 'Fitness', c: 'ok' };
    if (bf < 25) return { t: 'Aceitável', c: 'warn' };
    return { t: 'Elevado', c: 'bad' };
  }
  function classRCQ(rcq, sexo) {
    var f = sexo === 'F';
    if (f) {
      if (rcq < 0.80) return { t: 'Baixo risco', c: 'ok' };
      if (rcq < 0.85) return { t: 'Risco moderado', c: 'warn' };
      return { t: 'Risco alto', c: 'bad' };
    }
    if (rcq < 0.90) return { t: 'Baixo risco', c: 'ok' };
    if (rcq < 1.0) return { t: 'Risco moderado', c: 'warn' };
    return { t: 'Risco alto', c: 'bad' };
  }

  /* ---------- % Gordura por dobras cutâneas (Jackson & Pollock) ---------- */
  function clampBF(v) { return Math.max(3, Math.min(60, v)); }
  function siri(db) { return 495 / db - 450; }      // densidade -> % gordura

  function skinfoldBF(sexo, idade, f) {
    // f: dobras em mm (peito, axilar, triceps, subescapular, abdominal, suprailiaca, coxa)
    var res = { bf3: null, bf7: null };
    var homem = sexo === 'M';

    // --- 7 dobras (precisa de todas) ---
    var all7 = ['peito', 'axilar', 'triceps', 'subescapular', 'abdominal', 'suprailiaca', 'coxa'];
    var have7 = all7.every(function (k) { return !isNaN(f[k]) && f[k] > 0; });
    if (have7) {
      var s7 = all7.reduce(function (a, k) { return a + f[k]; }, 0);
      var db7 = homem
        ? 1.112 - 0.00043499 * s7 + 0.00000055 * s7 * s7 - 0.00028826 * idade
        : 1.097 - 0.00046971 * s7 + 0.00000056 * s7 * s7 - 0.00012828 * idade;
      res.bf7 = clampBF(siri(db7));
    }

    // --- 3 dobras (sítios variam por sexo) ---
    var s3keys = homem ? ['peito', 'abdominal', 'coxa'] : ['triceps', 'suprailiaca', 'coxa'];
    var have3 = s3keys.every(function (k) { return !isNaN(f[k]) && f[k] > 0; });
    if (have3) {
      var s3 = s3keys.reduce(function (a, k) { return a + f[k]; }, 0);
      var db3 = homem
        ? 1.10938 - 0.0008267 * s3 + 0.0000016 * s3 * s3 - 0.0002574 * idade
        : 1.0994921 - 0.0009929 * s3 + 0.0000023 * s3 * s3 - 0.0001392 * idade;
      res.bf3 = clampBF(siri(db3));
    }
    return res;
  }

  function fillMethod(cardId, valId, bfVal, used) {
    var card = document.getElementById(cardId);
    if (bfVal == null) { card.style.display = 'none'; card.classList.remove('used'); return; }
    card.style.display = '';
    document.getElementById(valId).textContent = dec1(bfVal) + '%';
    card.classList.toggle('used', !!used);
  }

  /* ---------- Macros de um objetivo ---------- */
  function macros(kcal, peso, gPorKg) {
    var protG = Math.round(gPorKg * peso);
    var fatG = Math.round((0.25 * kcal) / 9);
    var carbG = Math.round((kcal - protG * 4 - fatG * 9) / 4);
    if (carbG < 0) carbG = 0;
    return { prot: protG, fat: fatG, carb: carbG };
  }
  function round10(n) { return Math.round(n / 10) * 10; }

  /* ---------- Simetria de um par ---------- */
  function simetria(d, e) {
    if (isNaN(d) || isNaN(e) || d <= 0 || e <= 0) return null;
    var diff = Math.abs(d - e);
    var pct = (diff / Math.max(d, e)) * 100;
    var cls = 'ok', txt = 'Simétrico';
    if (pct >= 5) { cls = 'bad'; txt = 'Assimetria relevante'; }
    else if (pct >= 2) { cls = 'warn'; txt = 'Leve assimetria'; }
    return { pct: pct, diff: diff, cls: cls, txt: txt };
  }
  function renderSym(rowId, barId, valId, d, e) {
    var s = simetria(d, e);
    var row = document.getElementById(rowId);
    if (!s) { row.style.display = 'none'; return false; }
    row.style.display = '';
    var bar = document.getElementById(barId);
    bar.style.width = Math.min(100, 100 - s.pct * 6) + '%'; // quanto mais simétrico, mais cheia
    var val = document.getElementById(valId);
    val.textContent = s.diff.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' cm · ' + s.pct.toFixed(1) + '% · ' + s.txt;
    val.className = 'sr-val ' + (s.cls === 'ok' ? '' : s.cls);
    return true;
  }

  /* ---------- Cálculo principal ---------- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (!validate()) return;

    var sexo = sexoSel.value;
    var idade = num('idade');
    var peso = num('peso');
    var altura = num('altura');
    var alturaM = altura / 100;
    var atividade = parseFloat(document.getElementById('atividade').value);
    var objetivo = document.getElementById('objetivo').value;   // definicao | manutencao | hipertrofia | ''
    var perfil = document.getElementById('perfil').value;       // ecto | meso | endo | ''

    var pescoco = num('pescoco');
    var cintura = num('cintura');
    var quadril = num('quadril');

    /* --- IMC --- */
    var imc = peso / (alturaM * alturaM);
    set('r-imc', dec1(imc));
    var ci = classIMC(imc);
    setClass('r-imc-c', ci.t, ci.c);

    /* --- % Gordura: Navy (circunferências) + Pollock (dobras) --- */
    var bfNavy = NaN;
    if (sexo === 'M') {
      var dM = cintura - pescoco;
      if (dM > 0) bfNavy = 495 / (1.0324 - 0.19077 * Math.log10(dM) + 0.15456 * Math.log10(altura)) - 450;
    } else {
      var dF = cintura + quadril - pescoco;
      if (dF > 0) bfNavy = 495 / (1.29579 - 0.35004 * Math.log10(dF) + 0.22100 * Math.log10(altura)) - 450;
    }
    var navyOk = !isNaN(bfNavy) && isFinite(bfNavy);
    if (navyOk) bfNavy = clampBF(bfNavy);

    // Dobras cutâneas (opcional)
    var folds = {
      peito: num('d_peito'), axilar: num('d_axilar'), triceps: num('d_triceps'),
      subescapular: num('d_subescapular'), abdominal: num('d_abdominal'),
      suprailiaca: num('d_suprailiaca'), coxa: num('d_coxa')
    };
    var sf = skinfoldBF(sexo, idade, folds);

    // Escolhe o método mais completo disponível: 7 dobras > 3 dobras > circunferências
    var bf, method, methodSub;
    if (sf.bf7 != null) {
      bf = sf.bf7; method = '7 dobras · Pollock';
      methodSub = 'Calculado por 7 dobras cutâneas (Jackson & Pollock) — o método mais preciso desta ferramenta.';
    } else if (sf.bf3 != null) {
      bf = sf.bf3; method = '3 dobras · Pollock';
      methodSub = 'Calculado por 3 dobras cutâneas (Jackson & Pollock). Preencha as 7 dobras para o resultado mais preciso.';
    } else if (navyOk) {
      bf = bfNavy; method = 'Circunferências · Navy';
      methodSub = 'Estimativa por circunferências (U.S. Navy). Adicione dobras cutâneas para maior precisão.';
    } else { bf = NaN; }
    var bfOk = !isNaN(bf) && isFinite(bf);

    if (bfOk) {
      set('r-bf', dec1(bf));
      var cb = classBF(bf, sexo);
      set('r-bf-class', cb.t);
      set('r-bf-sub', methodSub);
      var pos = Math.max(0, Math.min(100, ((bf - 5) / (45 - 5)) * 100));
      document.getElementById('r-bf-marker').style.left = pos + '%';
      document.getElementById('r-bf-marker').style.display = '';
    } else {
      set('r-bf', '—');
      set('r-bf-class', 'Verifique as medidas');
      set('r-bf-sub', 'A cintura precisa ser maior que o pescoço' + (sexo === 'F' ? ' (cintura + quadril − pescoço)' : '') + ', ou preencha as dobras cutâneas.');
      document.getElementById('r-bf-marker').style.display = 'none';
    }

    // Comparação de métodos (do básico ao completo)
    var anyMethod = navyOk || sf.bf3 != null || sf.bf7 != null;
    document.getElementById('bf-methods').style.display = anyMethod ? '' : 'none';
    fillMethod('bfm-navy', 'bfm-navy-v', navyOk ? bfNavy : null, method === 'Circunferências · Navy');
    fillMethod('bfm-p3', 'bfm-p3-v', sf.bf3, method === '3 dobras · Pollock');
    fillMethod('bfm-p7', 'bfm-p7-v', sf.bf7, method === '7 dobras · Pollock');

    /* --- Massa magra / gorda --- */
    if (bfOk) {
      var massaGorda = peso * bf / 100;
      var massaMagra = peso - massaGorda;
      set('r-magra', dec1(massaMagra)); set('r-magra-u', 'kg');
      set('r-gorda', dec1(massaGorda)); set('r-gorda-u', 'kg');
    } else {
      set('r-magra', '—'); set('r-magra-u', '');
      set('r-gorda', '—'); set('r-gorda-u', '');
    }

    /* --- TMB (Mifflin-St Jeor) --- */
    var tmb = (10 * peso) + (6.25 * altura) - (5 * idade) + (sexo === 'M' ? 5 : -161);
    set('r-tmb', intBR(tmb));

    /* --- GCT --- */
    var gct = tmb * atividade;
    set('r-gct', intBR(gct));

    /* --- RCQ --- */
    if (!isNaN(quadril) && quadril > 0 && !isNaN(cintura)) {
      var rcq = cintura / quadril;
      set('r-rcq', rcq.toFixed(2).replace('.', ','));
      var cr = classRCQ(rcq, sexo);
      setClass('r-rcq-c', cr.t, cr.c);
    } else {
      set('r-rcq', '—');
      setClass('r-rcq-c', sexo === 'M' ? 'Informe o quadril' : '—', '');
    }

    /* --- Metas calóricas (moduladas por perfil) --- */
    var cutF = 0.80, bulkF = 1.12;
    if (perfil === 'ecto') { cutF = 0.82; bulkF = 1.15; }
    else if (perfil === 'endo') { cutF = 0.78; bulkF = 1.08; }

    var cutKcal = Math.max(gct * cutF, tmb * 1.1);   // nunca abaixo de ~110% da TMB
    var maintKcal = gct;
    var bulkKcal = gct * bulkF;

    var mCut = macros(cutKcal, peso, 2.2);
    var mMaint = macros(maintKcal, peso, 2.0);
    var mBulk = macros(bulkKcal, peso, 1.9);

    set('g-cut-kcal', intBR(round10(cutKcal)));
    set('g-cut-prot', mCut.prot + ' g'); set('g-cut-carb', mCut.carb + ' g'); set('g-cut-fat', mCut.fat + ' g');
    set('g-maint-kcal', intBR(round10(maintKcal)));
    set('g-maint-prot', mMaint.prot + ' g'); set('g-maint-carb', mMaint.carb + ' g'); set('g-maint-fat', mMaint.fat + ' g');
    set('g-bulk-kcal', intBR(round10(bulkKcal)));
    set('g-bulk-prot', mBulk.prot + ' g'); set('g-bulk-carb', mBulk.carb + ' g'); set('g-bulk-fat', mBulk.fat + ' g');

    // Destaque do objetivo escolhido
    ['g-cut', 'g-maint', 'g-bulk'].forEach(function (id) {
      document.getElementById(id).classList.remove('feat');
      var fn = document.querySelector('#' + id + ' .feat-note');
      if (fn) fn.style.display = 'none';
    });
    var featId = objetivo === 'definicao' ? 'g-cut' : objetivo === 'hipertrofia' ? 'g-bulk' : objetivo === 'manutencao' ? 'g-maint' : '';
    if (featId) {
      document.getElementById(featId).classList.add('feat');
      var note = document.querySelector('#' + featId + ' .feat-note');
      if (note) note.style.display = '';
    }

    /* --- Recomendações extras --- */
    var pesoMin = 18.5 * alturaM * alturaM;
    var pesoMax = 24.9 * alturaM * alturaM;
    set('r-peso-ideal', dec1(pesoMin) + ' – ' + dec1(pesoMax) + ' kg');

    var protLow = Math.round(1.8 * peso);
    var protHigh = Math.round(2.2 * peso);
    set('r-proteina', protLow + ' – ' + protHigh + ' g');

    var agua = 35 * peso / 1000;
    set('r-agua', dec1(agua) + ' L');

    set('r-gordura-ideal', sexo === 'M' ? '10 – 20 %' : '18 – 28 %');

    /* --- Simetria --- */
    var anyS = false;
    anyS = renderSym('sym-braco', 'sym-braco-bar', 'sym-braco-val', num('braco_d'), num('braco_e')) || anyS;
    anyS = renderSym('sym-coxa', 'sym-coxa-bar', 'sym-coxa-val', num('coxa_d'), num('coxa_e')) || anyS;
    anyS = renderSym('sym-pant', 'sym-pant-bar', 'sym-pant-val', num('pant_d'), num('pant_e')) || anyS;
    document.getElementById('symmetry').style.display = anyS ? '' : 'none';

    /* --- WhatsApp com resumo --- */
    var resumo = 'Olá Lukas! Fiz minha leitura corporal na calculadora e quero orientação.%0A%0A' +
      '• % Gordura: ' + (bfOk ? dec1(bf) + '% (' + method + ')' : 'n/d') + '%0A' +
      '• IMC: ' + dec1(imc) + '%0A' +
      '• TMB: ' + intBR(tmb) + ' kcal%0A' +
      '• Gasto total (GCT): ' + intBR(gct) + ' kcal%0A' +
      '• Objetivo: ' + (objetivo ? ({ definicao: 'Definição', manutencao: 'Manutenção', hipertrofia: 'Hipertrofia' })[objetivo] : 'a definir');
    document.getElementById('r-whats').href = 'https://wa.me/5511948834582?text=' + resumo;

    /* --- Exibir --- */
    results.classList.add('show');
    setTimeout(function () { document.getElementById('res-head').scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
  });

  /* ---------- Recalcular / voltar ao formulário ---------- */
  var recalc = document.getElementById('recalcBtn');
  if (recalc) recalc.addEventListener('click', function () {
    document.getElementById('topo-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- Imprimir ---------- */
  var printBtn = document.getElementById('printBtn');
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  /* ---------- Ano no rodapé + data do relatório impresso ---------- */
  var agora = new Date();
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = agora.getFullYear();
  var pd = document.getElementById('print-date');
  if (pd) pd.textContent = agora.toLocaleDateString('pt-BR');
})();
