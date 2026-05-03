import { fmtUSD } from "@/lib/currency";

export const KHR = (n: number) => `៛${Math.round((n || 0) * 4100).toLocaleString()}`;

export type InvoiceItem = {
  name: string;
  description?: string | null;
  item_type?: string;
  quantity: number;
  price_usd: number;
};

export type InvoiceData = {
  invoice: string;
  created_at: string | Date;
  status?: string;
  patient?: { full_name?: string; patient_code?: string; gender?: string } | null;
  referrer?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  due: number;
  splits?: { method: string; amount: number }[];
  notes?: string;
};

export const buildInvoiceHTML = (r: InvoiceData, compact = false) => {
  const dateStr = new Date(r.created_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const primaryMethod = (r.splits && r.splits[0]?.method) || "—";
  const rows = r.items.map((i, idx) => `
    <tr>
      <td class="c sl">${String(idx + 1).padStart(2, "0")}</td>
      <td><div class="iname">${i.name}</div>${i.description ? `<div class="isub">${i.description}</div>` : i.item_type ? `<div class="isub">${i.item_type}</div>` : ""}</td>
      <td class="r">${fmtUSD(i.price_usd)}</td>
      <td class="c">${i.quantity}</td>
      <td class="r b">${fmtUSD(i.price_usd * i.quantity)}</td>
    </tr>`).join("");
  return `<html><head><title>${r.invoice}</title><style>
    *{box-sizing:border-box;margin:0;padding:0} body{font-family:'Segoe UI',system-ui,sans-serif;color:#1e293b;background:#fff;padding:${compact ? "12px" : "32px"};max-width:${compact ? "380px" : "780px"};margin:auto;font-size:${compact ? "11px" : "13px"}}
    .head{background:#f1f5f9;padding:${compact ? "16px" : "28px"} 20px;text-align:center;border-radius:6px 6px 0 0}
    .logo{width:${compact ? "36px" : "48px"};height:${compact ? "36px" : "48px"};margin:0 auto 8px;color:#0F6E56}
    .clinic{font-size:${compact ? "16px" : "22px"};font-weight:800;color:#0F6E56;letter-spacing:1px}
    .addr{font-size:${compact ? "9px" : "11px"};color:#64748b;margin-top:6px;line-height:1.5}
    .meta{display:flex;justify-content:space-between;padding:${compact ? "12px 4px" : "20px 4px"};border-bottom:1px solid #e2e8f0;flex-wrap:wrap;gap:8px}
    .meta .lbl{font-size:${compact ? "9px" : "10px"};color:#0F6E56;font-weight:700;letter-spacing:1px;text-transform:uppercase}
    .meta .val{font-weight:700;color:#0f172a;margin-top:2px;font-size:${compact ? "11px" : "13px"}}
    .barcode{font-family:'Libre Barcode 39',monospace;font-size:${compact ? "20px" : "28px"};letter-spacing:1px;color:#0f172a;line-height:1}
    .pinfo{display:flex;justify-content:space-between;padding:${compact ? "12px 4px" : "18px 4px"};gap:16px;flex-wrap:wrap}
    .pinfo h3{color:#0F6E56;font-size:${compact ? "12px" : "14px"};margin-bottom:6px}
    .pinfo .pname{font-weight:700;color:#0f172a;font-size:${compact ? "12px" : "14px"}}
    .pinfo .psub{font-size:${compact ? "10px" : "11px"};color:#64748b;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    thead th{background:#0F6E56;color:#fff;padding:${compact ? "6px 8px" : "10px 12px"};text-align:left;font-size:${compact ? "9px" : "11px"};text-transform:uppercase;letter-spacing:0.5px;font-weight:700}
    thead th.r{text-align:right} thead th.c{text-align:center}
    tbody td{padding:${compact ? "8px" : "12px"};border-bottom:1px solid #e2e8f0;vertical-align:top}
    td.c{text-align:center} td.r{text-align:right} td.b{font-weight:700} td.sl{color:#64748b;font-weight:700}
    .iname{font-weight:600;color:#0f172a} .isub{font-size:${compact ? "9px" : "10px"};color:#64748b;margin-top:2px;text-transform:capitalize}
    .totbox{margin-left:auto;width:${compact ? "100%" : "55%"};padding:${compact ? "12px 0" : "16px 0"}}
    .totline{display:flex;justify-content:space-between;padding:${compact ? "5px 8px" : "8px 12px"};font-size:${compact ? "11px" : "13px"}}
    .totline.div{border-top:1px solid #e2e8f0;margin-top:4px;padding-top:8px}
    .grand{color:#0F6E56;font-weight:800;font-size:${compact ? "14px" : "17px"};padding:${compact ? "6px 8px" : "10px 12px"}}
    .paid{color:#0F6E56;font-weight:700}
    .due{color:#dc2626;font-weight:700}
    .foot{text-align:center;margin-top:${compact ? "16px" : "28px"};padding-top:${compact ? "12px" : "20px"};border-top:1px dashed #cbd5e1}
    .foot h4{color:#0F6E56;font-size:${compact ? "11px" : "13px"};letter-spacing:1px;margin-bottom:4px}
    .foot p{font-size:${compact ? "9px" : "10px"};color:#64748b}
    @media print{@page{margin:${compact ? "8mm" : "14mm"};size:${compact ? "80mm auto" : "A4"}} body{padding:0}}
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap" rel="stylesheet">
    </head><body>
    <div class="head">
      <svg class="logo" viewBox="0 0 48 48" fill="currentColor"><circle cx="24" cy="14" r="6"/><circle cx="14" cy="28" r="6"/><circle cx="34" cy="28" r="6"/><circle cx="24" cy="38" r="6"/></svg>
      <div class="clinic">PRIME POLY CLINIC</div>
      <div class="addr">Mittapheap Kampuchea Soviet, Street 705, Preah Sihanouk, Cambodia.<br/>+855 78 514 425 • primeclinic.centre@gmail.com</div>
    </div>
    <div class="meta">
      <div>
        <div class="lbl">Invoice No #</div><div class="val">${r.invoice}</div>
        <div class="lbl" style="margin-top:8px">Date</div><div class="val">${dateStr}</div>
        <div style="margin-top:6px;font-size:${compact ? "10px" : "12px"}">Paid By: <b style="text-transform:capitalize">${primaryMethod}</b></div>
      </div>
      <div style="text-align:right">
        <div class="lbl">Invoice Code:</div>
        <div class="barcode">*${r.invoice}*</div>
      </div>
    </div>
    <div class="pinfo">
      <div>
        <h3>Patient :</h3>
        <div class="pname">${r.patient?.full_name || "Walking In"}</div>
        <div class="psub">ID : ${r.patient?.patient_code || "—"}</div>
        ${r.patient?.gender ? `<div class="psub">Gender: ${r.patient.gender}</div>` : ""}
      </div>
      <div style="text-align:right">
        <h3>Referrer Name:</h3>
        <div class="psub">${r.referrer || "—"}</div>
      </div>
    </div>
    <table>
      <thead><tr><th class="c" style="width:50px">Item</th><th>Description</th><th class="r" style="width:80px">Price</th><th class="c" style="width:50px">Qty</th><th class="r" style="width:100px">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totbox">
      <div class="totline div"><span>Subtotal:</span><span>${fmtUSD(r.subtotal)} / ${KHR(r.subtotal)}</span></div>
      ${r.discount > 0 ? `<div class="totline"><span>Discount:</span><span class="paid">−${fmtUSD(r.discount)}</span></div>` : ""}
      <div class="totline grand"><span>Grand Total:</span><span>${fmtUSD(r.total)}</span></div>
      <div class="totline grand" style="padding-top:0"><span>Grand Total:</span><span>${KHR(r.total)}</span></div>
      <div class="totline"><span>Amount Paid</span><span class="paid">${fmtUSD(r.paid)}</span></div>
      ${r.due > 0 ? `<div class="totline"><span>Balance Due</span><span class="due">${fmtUSD(r.due)}</span></div>` : ""}
    </div>
    <div class="foot">
      <h4>THANK YOU FOR CHOOSING PRIME POLY CLINIC!</h4>
      <p>FOR QUESTIONS, CONTACT PRIMECLINIC.CENTRE@GMAIL.COM</p>
    </div>
    </body></html>`;
};

export const printInvoice = (r: InvoiceData, compact = false) => {
  const w = window.open("", "_blank", compact ? "width=420,height=700" : "width=820,height=900");
  if (!w) return;
  w.document.write(buildInvoiceHTML(r, compact));
  w.document.write(`<script>window.onload=()=>window.print()<\/script>`);
  w.document.close();
};
