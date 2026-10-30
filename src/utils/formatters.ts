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
  return str.startsWith('R$') ? str : `R$ ${str}`;
}
