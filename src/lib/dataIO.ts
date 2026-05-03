import * as XLSX from "xlsx";
import Papa from "papaparse";

export function exportToExcel<T extends Record<string, any>>(rows: T[], filename: string, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportToCSV<T extends Record<string, any>>(rows: T[], filename: string) {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function parseImportFile(file: File): Promise<any[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data as any[]),
        error: reject,
      });
    });
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws);
}

export function downloadTemplate(headers: string[], filename: string, sample?: Record<string, any>) {
  const row = sample ?? Object.fromEntries(headers.map(h => [h, ""]));
  exportToExcel([row], filename);
}

export function printBarcodes(items: { code: string; name: string; price?: number }[], title = "Barcodes") {
  const w = window.open("", "_blank"); if (!w) return;
  w.document.write(`
    <html><head><title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
    <style>
      body{font-family:Arial;padding:20px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
      .card{border:1px dashed #999;border-radius:6px;padding:10px;text-align:center;page-break-inside:avoid}
      .name{font-size:12px;font-weight:600;margin-bottom:4px}
      .price{font-size:11px;color:#0369a1}
      svg{width:100%;height:60px}
      @media print{.no-print{display:none}}
    </style></head><body>
    <div class="no-print" style="margin-bottom:12px"><button onclick="window.print()">Print</button></div>
    <div class="grid">
      ${items.map((it, i) => `
        <div class="card">
          <div class="name">${it.name}</div>
          <svg id="bc-${i}"></svg>
          ${it.price !== undefined ? `<div class="price">$${Number(it.price).toFixed(2)}</div>` : ""}
        </div>
      `).join("")}
    </div>
    <script>
      window.addEventListener('load', function(){
        ${items.map((it, i) => `try{JsBarcode("#bc-${i}", "${it.code}", {format:"CODE128",width:1.6,height:50,fontSize:11,margin:2});}catch(e){}`).join("\n")}
      });
    </script>
    </body></html>
  `);
  w.document.close();
}
