document.getElementById('calculatorForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // 1. Coleta de Dados
    const sexo = document.getElementById('sexo').value;
    const idade = parseFloat(document.getElementById('idade').value);
    const peso = parseFloat(document.getElementById('peso').value);
    const altura = parseFloat(document.getElementById('altura').value);
    const atividadeFator = parseFloat(document.getElementById('atividade').value);
    const biotipo = document.getElementById('biotipo').value;

    // Medidas em CM
    const pescoco = parseFloat(document.getElementById('pescoco').value || 0);
    const cintura = parseFloat(document.getElementById('cintura').value);
    const abdomen = parseFloat(document.getElementById('abdomen').value || 0);
    const quadril = parseFloat(document.getElementById('quadril').value || 0);
    const bracoDireito = parseFloat(document.getElementById('braco-direito').value || 0);
    const bracoEsquerdo = parseFloat(document.getElementById('braco-esquerdo').value || 0);
    const pernaDireita = parseFloat(document.getElementById('perna-direita').value || 0);
    const pernaEsquerda = parseFloat(document.getElementById('perna-esquerda').value || 0);

    // 2. Variáveis de Resultado
    let percentualGordura = 0;
    let rcq = 0;
    let tmb = 0;
    let gct = 0;

    // --- CÁLCULO DE % DE GORDURA (Navy Method) ---
    // Fórmula adaptada para centímetros
    if (sexo === 'M') {
        // Homens: 86.010 * log10(Cintura - Pescoço) - 70.041 * log10(Altura) + 36.76
        const diff = cintura - pescoco;
        if (diff > 0 && altura > 0 && pescoco > 0) {
            percentualGordura = (86.010 * Math.log10(diff)) - (70.041 * Math.log10(altura)) + 36.76;
        }
    } else if (sexo === 'F') {
        // Mulheres: 163.205 * log10(Cintura + Quadril - Pescoço) - 97.684 * log10(Altura) - 78.387
        const diff = cintura + quadril - pescoco;
        if (diff > 0 && altura > 0 && pescoco > 0 && quadril > 0) {
            percentualGordura = (163.205 * Math.log10(diff)) - (97.684 * Math.log10(altura)) - 78.387;
        }
    }

    // Limitar o percentual de gordura a valores realistas
    if (percentualGordura < 3) percentualGordura = 3;
    if (percentualGordura > 50) percentualGordura = 50;

    // --- CÁLCULO RCQ (Relação Cintura Quadril) ---
    if (quadril > 0 && cintura > 0) {
        rcq = cintura / quadril;
    } else {
        rcq = NaN;
    }

    // --- CÁLCULO TMB (Taxa de Metabolismo Basal - Mifflin-St Jeor) ---
    if (sexo === 'M') {
        // Homens: 10 * Peso + 6.25 * Altura - 5 * Idade + 5
        tmb = (10 * peso) + (6.25 * altura) - (5 * idade) + 5;
    } else if (sexo === 'F') {
        // Mulheres: 10 * Peso + 6.25 * Altura - 5 * Idade - 161
        tmb = (10 * peso) + (6.25 * altura) - (5 * idade) - 161;
    }

    // --- CÁLCULO GCT (Gasto Calórico Total) ---
    gct = tmb * atividadeFator;

    // --- AJUSTE BASEADO NO BIOTIPO ---
    let ajusteBiotipo = 1.0;
    if (biotipo === 'ectomorfo') {
        ajusteBiotipo = 1.05; // Ectomorfos tendem a ter metabolismo mais rápido
    } else if (biotipo === 'endomorfo') {
        ajusteBiotipo = 0.95; // Endomorfos tendem a ter metabolismo mais lento
    }
    
    gct = gct * ajusteBiotipo;

    // --- CÁLCULO DE METAS CALÓRICAS ---
    // Déficit mais moderado para preservar massa muscular
    const reducaoCalorica = gct - 400;
    // Excedente calculado com base no biotipo
    let ganhoCaloricoExtra = 400;
    if (biotipo === 'ectomorfo') {
        ganhoCaloricoExtra = 500; // Ectomorfos precisam de mais calorias
    } else if (biotipo === 'endomorfo') {
        ganhoCaloricoExtra = 300; // Endomorfos ganham peso mais facilmente
    }
    const ganhoCalorico = gct + ganhoCaloricoExtra;

    // 3. Exibição dos Resultados com formatação
    // % de Gordura
    if (isNaN(percentualGordura) || percentualGordura <= 0 || !pescoco || (sexo === 'F' && !quadril)) {
        document.getElementById('gordura-result').textContent = 'Dados insuficientes';
        document.getElementById('gordura-result').classList.add('text-red-400');
    } else {
        const gorduraTexto = percentualGordura.toFixed(1) + '%';
        let classificacao = '';
        
        if (sexo === 'M') {
            if (percentualGordura < 6) classificacao = ' (Atleta)';
            else if (percentualGordura < 14) classificacao = ' (Fitness)';
            else if (percentualGordura < 18) classificacao = ' (Aceitável)';
            else if (percentualGordura < 25) classificacao = ' (Sobrepeso)';
            else classificacao = ' (Obesidade)';
        } else {
            if (percentualGordura < 14) classificacao = ' (Atleta)';
            else if (percentualGordura < 21) classificacao = ' (Fitness)';
            else if (percentualGordura < 25) classificacao = ' (Aceitável)';
            else if (percentualGordura < 32) classificacao = ' (Sobrepeso)';
            else classificacao = ' (Obesidade)';
        }
        
        document.getElementById('gordura-result').textContent = gorduraTexto + classificacao;
        document.getElementById('gordura-result').classList.remove('text-red-400');
    }
    
    // RCQ
    if (isNaN(rcq)) {
        document.getElementById('rcq-result').textContent = 'Dados insuficientes';
        document.getElementById('rcq-result').classList.add('text-red-400');
    } else {
        let riscoRCQ = '';
        if (sexo === 'M') {
            if (rcq < 0.95) riscoRCQ = ' (Baixo risco)';
            else if (rcq < 1.0) riscoRCQ = ' (Moderado)';
            else riscoRCQ = ' (Alto risco)';
        } else {
            if (rcq < 0.80) riscoRCQ = ' (Baixo risco)';
            else if (rcq < 0.85) riscoRCQ = ' (Moderado)';
            else riscoRCQ = ' (Alto risco)';
        }
        document.getElementById('rcq-result').textContent = rcq.toFixed(2) + riscoRCQ;
        document.getElementById('rcq-result').classList.remove('text-red-400');
    }

    // TMB
    document.getElementById('tmb-result').textContent = Math.round(tmb) + ' kcal/dia';
    
    // GCT
    document.getElementById('gct-result').textContent = Math.round(gct) + ' kcal/dia';
    
    // Metas
    document.getElementById('reducao-result').textContent = Math.round(reducaoCalorica) + ' kcal/dia';
    document.getElementById('ganho-result').textContent = Math.round(ganhoCalorico) + ' kcal/dia';

    // 4. Mostrar a seção de resultados com animação suave
    const resultsSection = document.getElementById('results');
    resultsSection.style.display = 'block';
    
    // Scroll suave até os resultados
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
});

// Validação dinâmica do formulário
document.getElementById('sexo').addEventListener('change', function() {
    const quadrilInput = document.getElementById('quadril');
    if (this.value === 'F') {
        quadrilInput.required = true;
        quadrilInput.parentElement.querySelector('label').innerHTML = 
            'Quadril <span class="text-red-400">*</span>';
    } else {
        quadrilInput.required = false;
        quadrilInput.parentElement.querySelector('label').textContent = 'Quadril';
    }
});