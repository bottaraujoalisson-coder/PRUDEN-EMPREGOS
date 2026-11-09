export function formatSalaryBRL(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return 'Salário a combinar';
  const str = String(value).trim();
  if (!str || /combinar/i.test(str)) return 'Salário a combinar';
  if (typeof value === 'number' && !isNaN(value) && value > 0) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
  const cleanNumberStr = str.replace(/[^\d,.-]/g, '');
  const normalizedNumeric =
    cleanNumberStr.includes(',') && cleanNumberStr.includes('.')
      ? Number(cleanNumberStr.replace(/\./g, '').replace(',', '.'))
      : Number(cleanNumberStr.replace(',', '.'));
  if (!isNaN(normalizedNumeric) && normalizedNumeric > 0 && /^[\d.,\sR$]+$/.test(str)) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(normalizedNumeric);
  }

  // Suporte a valores como "2200 + comissão" ou "R$ 2200 + comissão"
  const suffixMatch = str.match(/^(?:R\$\s*)?([\d.,]+)\s*(\+.*)$/i);
  if (suffixMatch) {
    const numPart = suffixMatch[1];
    const suffix = suffixMatch[2].trim();
    const cleanNum =
      numPart.includes(',') && numPart.includes('.')
        ? Number(numPart.replace(/\./g, '').replace(',', '.'))
        : Number(numPart.replace(',', '.'));
    if (!isNaN(cleanNum) && cleanNum > 0) {
      const formattedNum = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(cleanNum);
      return `${formattedNum} ${suffix}`;
    }
  }

  return str.startsWith('R$') ? str : `R$ ${str}`;
}
