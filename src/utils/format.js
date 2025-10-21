export function fmtAmt(v, decimals = 8) {
  const num = Number(v || 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function fmtUSD(v) {
  const num = Number(v || 0);
  if (!isFinite(num)) return '$0.00';
  return num.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
