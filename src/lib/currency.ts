// USD <-> KHR conversion utilities
export const USD_TO_KHR = 4100;

export const fmtUSD = (n: number) => `$${(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fmtKHR = (n: number) => `៛${Math.round((n ?? 0) * USD_TO_KHR).toLocaleString("en-US")}`;
export const fmtBoth = (n: number) => `${fmtUSD(n)} • ${fmtKHR(n)}`;
