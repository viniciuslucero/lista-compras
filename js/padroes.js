/**
 * Motor de padrões de consumo
 * Separa compras semanais das mensais e gera a lista inteligente
 */

// Limpa string numérica vinda do CSV
function parseNum(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace('Vl. Unit.:', '').replace('Qtde.:', '').replace(',', '.').trim()) || 0;
}

// Classifica nota como pesada (≥R$150) ou semanal
function tipoNota(valorNota) {
  return valorNota >= 150 ? 'mensal' : 'semanal';
}

// Agrupa itens por nota (chave) e calcula valor total
function agruparPorNota(compras) {
  const notas = {};
  for (const c of compras) {
    if (!notas[c.chave]) notas[c.chave] = { chave: c.chave, data: c.data, valor: 0, itens: [] };
    notas[c.chave].valor += parseNum(c.valor_total_item);
    notas[c.chave].itens.push(c);
  }
  return Object.values(notas);
}

// Calcula padrões por produto
export function calcularPadroes(compras) {
  const notas = agruparPorNota(compras);
  const semanal = {};
  const mensal = {};

  for (const nota of notas) {
    const tipo = tipoNota(nota.valor);
    const bucket = tipo === 'semanal' ? semanal : mensal;
    for (const item of nota.itens) {
      const d = item.descricao?.trim();
      if (!d) continue;
      if (!bucket[d]) bucket[d] = { vezes: 0, qtdeTotal: 0, valorTotal: 0, datas: [] };
      bucket[d].vezes++;
      bucket[d].qtdeTotal += parseNum(item.quantidade);
      bucket[d].valorTotal += parseNum(item.valor_unitario);
      if (item.data) bucket[d].datas.push(item.data);
    }
  }

  return { semanal, mensal, totalNotas: notas.length };
}

// Retorna lista semanal ordenada por frequência
export function gerarListaSemanal(compras, ajustes = []) {
  const { semanal } = calcularPadroes(compras);
  const ajustesMap = {};
  for (const a of ajustes) ajustesMap[a.descricao] = a.qtde;

  return Object.entries(semanal)
    .filter(([, d]) => d.vezes >= 2)
    .sort((a, b) => b[1].vezes - a[1].vezes)
    .map(([nome, d]) => {
      const qtdeMed = d.qtdeTotal / d.vezes;
      const precomed = d.valorTotal / d.vezes;
      return {
        descricao: nome,
        vezes: d.vezes,
        qtde: ajustesMap[nome] ?? Math.round(qtdeMed) || 1,
        valorUnitario: precomed,
        frequencia: d.vezes >= 5 ? 'semanal' : 'quinzenal',
        categoria: inferirCategoria(nome),
      };
    });
}

// Retorna lista mensal ordenada por frequência
export function gerarListaMensal(compras, ajustes = []) {
  const { mensal } = calcularPadroes(compras);
  const ajustesMap = {};
  for (const a of ajustes) ajustesMap[a.descricao] = a.qtde;

  return Object.entries(mensal)
    .filter(([, d]) => d.vezes >= 2)
    .sort((a, b) => b[1].vezes - a[1].vezes)
    .map(([nome, d]) => {
      const qtdeMed = d.qtdeTotal / d.vezes;
      const precomed = d.valorTotal / d.vezes;
      return {
        descricao: nome,
        vezes: d.vezes,
        qtde: ajustesMap[nome] ?? Math.round(qtdeMed) || 1,
        valorUnitario: precomed,
        frequencia: 'mensal',
        categoria: inferirCategoria(nome),
      };
    });
}

// Infere categoria pelo nome do produto
export function inferirCategoria(nome) {
  const n = nome.toUpperCase();
  if (/FRANGO|COXA|SASSAMI|SOBRECOXA|PEITO|CARNE|BISTECA|LINGUICA|BACON|FILE|FRALDINHA|COXAO/.test(n)) return 'Carnes';
  if (/BATATA|CEBOLA|TOMATE|LIMAO|ALFACE|CENOURA|ABOBORA|UVA|MACA|BANANA|LARANJA|BROCOLIS|ABOBRINHA|HORTEL/.test(n)) return 'Hortifruti';
  if (/REFRIG|SUCO|AGUA|COCA|PEPSI|GUARANA|CERVEJA|VINHO|LEITE/.test(n)) return 'Bebidas';
  if (/QUEIJO|OVOS|IOGURTE|MANTEIGA|REQUEIJAO|CREME DE LEITE|NATA/.test(n)) return 'Laticínios';
  if (/PAO|TORRADA|BISC|COOKIE|BOLO|WAFER/.test(n)) return 'Padaria';
  if (/DETERG|SABAO|AMACIANTE|DESINFET|LIMPADOR|ESPONJA|VASSOURA|RODO|PAPEL HIG|PAPEL TOALHA/.test(n)) return 'Limpeza';
  if (/SHAMPOO|CONDIC|SABONETE|DESODOR|CREME|ESCOVA|PASTA/.test(n)) return 'Higiene';
  return 'Outros';
}

// Parseia CSV do produtos.csv gerado pelo selenium
export function parsearCSV(texto) {
  const linhas = texto.trim().split('\n');
  if (linhas.length < 2) return [];
  const header = linhas[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/"/g, ''));
  const itens = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = linhas[i].match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    if (cols.length < 2) continue;
    const obj = {};
    header.forEach((h, idx) => {
      obj[h] = (cols[idx] || '').replace(/"/g, '').trim();
    });
    if (obj.descricao) itens.push(obj);
  }
  return itens;
}

// Estatísticas gerais
export function calcularStats(compras) {
  const notas = agruparPorNota(compras);
  const totalGasto = notas.reduce((s, n) => s + n.valor, 0);
  const ticketMedio = notas.length ? totalGasto / notas.length : 0;

  const datas = notas.map(n => n.data).filter(Boolean).sort();
  const primeiraData = datas[0] || '-';
  const ultimaData = datas[datas.length - 1] || '-';

  return {
    totalItens: compras.length,
    totalNotas: notas.length,
    totalGasto: totalGasto.toFixed(2),
    ticketMedio: ticketMedio.toFixed(2),
    primeiraData,
    ultimaData,
  };
}
