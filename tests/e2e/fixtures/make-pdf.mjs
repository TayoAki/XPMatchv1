// Writes confirmation.pdf: a one-page, uncompressed PDF whose text is a hotel booking confirmation.
// Run `node tests/e2e/fixtures/make-pdf.mjs` to regenerate; the file is committed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const lines = [
  "Booking confirmation - Hotel Artemide",
  "Confirmation number: ART-88213",
  "Guest: Tayo Akigbogun (2 guests)",
  "Check-in: 10 October 2026 from 15:00",
  "Check-out: 13 October 2026 until 11:00",
  "Room: Superior double, breakfast included",
  "Address: Via Nazionale 22, 00184 Rome, Italy",
  "Total: EUR 780.00, free cancellation until 3 October 2026",
];

const escape = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const content = ["BT", "/F1 12 Tf", "50 760 Td", "16 TL", ...lines.map((l, i) => `${i ? "T* " : ""}(${escape(l)}) Tj`), "ET"].join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
  `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
];

let out = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(out, "latin1"));
  out += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xref = Buffer.byteLength(out, "latin1");
out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

const here = path.dirname(fileURLToPath(import.meta.url));
fs.writeFileSync(path.join(here, "confirmation.pdf"), Buffer.from(out, "latin1"));
console.log("wrote confirmation.pdf");
