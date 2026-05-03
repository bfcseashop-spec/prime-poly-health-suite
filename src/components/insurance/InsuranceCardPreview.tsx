import { forwardRef } from "react";
import Barcode from "react-barcode";
import { ShieldCheck, Crown, Gem, Star, Shield } from "lucide-react";

type Tier = "normal" | "silver" | "gold" | "vip";

const TIER: Record<Tier, { label: string; gradient: string; icon: any; accent: string }> = {
  normal: { label: "NORMAL",  gradient: "linear-gradient(135deg,#475569,#1e293b)", icon: Shield, accent: "#cbd5e1" },
  silver: { label: "SILVER",  gradient: "linear-gradient(135deg,#9ca3af,#4b5563)", icon: Star,   accent: "#e5e7eb" },
  gold:   { label: "GOLD",    gradient: "linear-gradient(135deg,#fbbf24,#b45309)", icon: Gem,    accent: "#fef3c7" },
  vip:    { label: "VIP",     gradient: "linear-gradient(135deg,#d946ef,#6d28d9,#3730a3)", icon: Crown, accent: "#f5d0fe" },
};

export type CardData = {
  card_no: string;
  patient_name: string | null;
  patient_code?: string | null;
  tier: Tier;
  discount_percent: number;
  coverage_amount_usd: number;
  used_amount_usd?: number;
  provider?: string | null;
  valid_from: string;
  valid_to: string | null;
  status?: string;
};

type Props = { card: CardData; clinicName?: string };

/** Standard credit card aspect ratio: 85.6 × 54 mm = 1.586 : 1 */
const CARD_W = 360;
const CARD_H = 227;

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { month: "2-digit", year: "2-digit" }) : "—");
const money = (n: number) => `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const InsuranceCardPreview = forwardRef<HTMLDivElement, Props>(({ card, clinicName = "Adora Clinic" }, ref) => {
  const cfg = TIER[card.tier];
  const Icon = cfg.icon;

  return (
    <div ref={ref} className="flex flex-col items-center gap-6 p-6 bg-muted/30">
      {/* FRONT */}
      <div
        className="relative rounded-2xl text-white shadow-elevated overflow-hidden"
        style={{ width: CARD_W, height: CARD_H, background: cfg.gradient }}
      >
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)", backgroundSize: "10px 10px" }}
        />

        <div className="relative h-full p-4 flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] tracking-[0.25em] font-semibold opacity-80">{clinicName.toUpperCase()}</p>
              <p className="text-[8px] tracking-widest opacity-70 mt-0.5">HEALTH INSURANCE</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-md px-2 py-1">
              <Icon className="h-3 w-3" />
              <span className="text-[10px] font-bold tracking-widest">{cfg.label}</span>
            </div>
          </div>

          {/* Chip */}
          <div className="mt-3 h-7 w-10 rounded-md" style={{
            background: "linear-gradient(135deg,#facc15,#ca8a04)",
            boxShadow: "inset 0 0 4px rgba(0,0,0,0.4)",
          }} />

          {/* Card number */}
          <p className="mt-3 font-mono text-[15px] tracking-[0.2em] font-semibold drop-shadow-sm">{card.card_no}</p>

          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[8px] uppercase tracking-widest opacity-70">Card Holder</p>
              <p className="text-[12px] font-semibold uppercase tracking-wide truncate">{card.patient_name || "—"}</p>
              {card.patient_code && <p className="text-[9px] opacity-80 font-mono">ID: {card.patient_code}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-[8px] uppercase tracking-widest opacity-70">Valid Thru</p>
              <p className="text-[12px] font-mono font-semibold">{fmt(card.valid_to)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BACK */}
      <div
        className="relative rounded-2xl shadow-elevated overflow-hidden bg-white"
        style={{ width: CARD_W, height: CARD_H }}
      >
        {/* magnetic strip */}
        <div className="absolute top-4 left-0 right-0 h-9 bg-neutral-900" />

        <div className="absolute top-[60px] left-3 right-3 flex flex-col gap-2">
          <div className="bg-neutral-100 border border-neutral-200 rounded p-2 flex items-center justify-between text-[9px] text-neutral-700">
            <div>
              <p className="font-bold">DISCOUNT</p>
              <p className="text-[14px] font-extrabold text-neutral-900 leading-none mt-0.5">{Number(card.discount_percent)}%</p>
            </div>
            <div className="text-center">
              <p className="font-bold">COVERAGE</p>
              <p className="text-[12px] font-extrabold text-neutral-900 leading-none mt-0.5">{money(card.coverage_amount_usd)}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">TIER</p>
              <p className="text-[12px] font-extrabold text-neutral-900 leading-none mt-0.5">{cfg.label}</p>
            </div>
          </div>

          {/* Barcode */}
          <div className="bg-white rounded p-1 flex justify-center">
            <Barcode
              value={card.card_no}
              format="CODE128"
              height={42}
              width={1.4}
              fontSize={10}
              margin={0}
              displayValue
              background="#ffffff"
            />
          </div>
        </div>

        <div className="absolute bottom-2 left-3 right-3 text-[7px] text-neutral-500 leading-tight">
          <p>This card is the property of {clinicName}. Present at reception for tier discount and to update visit history. If found, please return to {clinicName}.</p>
        </div>
      </div>
    </div>
  );
});
InsuranceCardPreview.displayName = "InsuranceCardPreview";

/** Open a print window with both sides of the card (print-optimized) */
export function printCard(card: CardData, clinicName = "Adora Clinic") {
  const cfg = TIER[card.tier];
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><title>Insurance Card - ${card.card_no}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; color:#111; background:#fff; }
  h1 { font-size: 14px; margin: 0 0 12px; color:#374151; font-weight:600; letter-spacing:.05em; text-transform:uppercase; }
  .row { display:flex; gap: 14mm; flex-wrap:wrap; }
  .card { width: 85.6mm; height: 53.98mm; border-radius: 3.18mm; position: relative; overflow:hidden; box-shadow: 0 1px 3px rgba(0,0,0,.15); color:#fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .front { background: ${cfg.gradient}; }
  .back  { background:#fff; color:#111; border:1px solid #e5e7eb; }
  .pad { padding: 4mm; height:100%; display:flex; flex-direction:column; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; }
  .brand { font-size: 7px; letter-spacing:.25em; opacity:.85; font-weight:700; }
  .sub { font-size:6px; letter-spacing:.2em; opacity:.7; margin-top:1mm; }
  .tierBadge { background:rgba(255,255,255,.18); padding:1.5mm 2.2mm; border-radius:1.5mm; font-size:7px; font-weight:700; letter-spacing:.2em; }
  .chip { width:9mm; height:6mm; border-radius:1.2mm; background: linear-gradient(135deg,#facc15,#ca8a04); margin-top:3mm; box-shadow: inset 0 0 1mm rgba(0,0,0,.35); }
  .cardNo { font-family: ui-monospace, Menlo, monospace; font-size:11pt; letter-spacing:.18em; margin-top:3mm; font-weight:600; }
  .bottom { margin-top:auto; display:flex; justify-content:space-between; align-items:flex-end; gap:3mm; }
  .lbl { font-size:6px; letter-spacing:.2em; text-transform:uppercase; opacity:.75; }
  .val { font-size:9pt; font-weight:600; text-transform:uppercase; }
  .strip { background:#111; height:8mm; margin: 4mm 0 3mm; }
  .info { display:flex; justify-content:space-between; gap:2mm; padding: 0 4mm; font-size:7pt; }
  .info .b { font-weight:800; font-size: 9pt; }
  .barcodeBox { padding: 2mm 4mm; text-align:center; }
  .terms { padding: 2mm 4mm; font-size: 5.5pt; color:#6b7280; line-height:1.3; }
  .actions { margin-top: 14mm; font-size: 9pt; color:#6b7280; }
  @media print { .actions { display:none; } }
</style>
</head><body>
  <h1>${clinicName} — Insurance Card</h1>
  <div class="row">
    <div class="card front">
      <div class="pad">
        <div class="top">
          <div>
            <div class="brand">${clinicName.toUpperCase()}</div>
            <div class="sub">HEALTH INSURANCE</div>
          </div>
          <div class="tierBadge">${cfg.label}</div>
        </div>
        <div class="chip"></div>
        <div class="cardNo">${card.card_no}</div>
        <div class="bottom">
          <div>
            <div class="lbl">Card Holder</div>
            <div class="val">${(card.patient_name || "—").replace(/</g, "&lt;")}</div>
            ${card.patient_code ? `<div style="font-family:ui-monospace,Menlo,monospace;font-size:7pt;opacity:.85;">ID: ${card.patient_code}</div>` : ""}
          </div>
          <div style="text-align:right;">
            <div class="lbl">Valid Thru</div>
            <div class="val" style="font-family:ui-monospace,Menlo,monospace;">${fmt(card.valid_to)}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card back">
      <div class="strip"></div>
      <div class="info">
        <div><div class="lbl" style="opacity:.6;">DISCOUNT</div><div class="b">${Number(card.discount_percent)}%</div></div>
        <div style="text-align:center;"><div class="lbl" style="opacity:.6;">COVERAGE</div><div class="b">${money(card.coverage_amount_usd)}</div></div>
        <div style="text-align:right;"><div class="lbl" style="opacity:.6;">TIER</div><div class="b">${cfg.label}</div></div>
      </div>
      <div class="barcodeBox">
        <svg id="bc"></svg>
      </div>
      <div class="terms">
        This card is the property of ${clinicName}. Present at reception for tier discount and to update visit history. If found, please return to ${clinicName}.
      </div>
    </div>
  </div>
  <div class="actions">Use your browser's print dialog to print both sides on one page.</div>

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    JsBarcode("#bc", ${JSON.stringify(card.card_no)}, { format:"CODE128", height:46, width:1.4, fontSize:10, margin:0 });
    setTimeout(() => window.print(), 350);
  </script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.open(); w.document.write(html); w.document.close();
}
