
export function formatCurrency(amount: number): string {
  return `KSH ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}