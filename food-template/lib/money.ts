export function money(value: string | number | null | undefined, currency = "PKR") {
  const amount = Number(value ?? 0);
  return `${currency === "PKR" ? "Rs." : currency} ${amount.toLocaleString("en-PK", { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}
