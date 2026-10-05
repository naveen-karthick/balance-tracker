import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatNumber, parseAmount, type LineView, type SheetTotals } from "@/lib/gst";

type SheetPdf = {
  title: string;
  gstLabel: string;
  lines: LineView[];
  totals: SheetTotals;
};

function money(value: number, digits: number): string {
  return formatNumber(value, digits);
}

function sheetRows(sheet: SheetPdf): string[][] {
  const lines = sheet.lines.filter(
    (line) => line.product.trim() !== "" || parseAmount(line.rate) !== 0 || parseAmount(line.quantity) !== 0,
  );
  const body = lines.map((line) => [
    line.product,
    line.rate,
    line.quantity,
    money(parseAmount(line.rate) * parseAmount(line.quantity), 2),
  ]);
  body.push(["", "", "Total", money(sheet.totals.subtotal, 2)]);
  body.push(["", "", sheet.gstLabel, money(sheet.totals.gst, 3)]);
  body.push(["", "", "Grand Total", money(sheet.totals.grand, 2)]);
  return body;
}

export function downloadGstPdf(sheets: SheetPdf[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GST Sheet", 14, 16);

  let startY = 22;
  sheets.forEach((sheet) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(sheet.title, 14, startY);
    const body = sheetRows(sheet);
    const grandRow = body.length - 1;
    autoTable(doc, {
      startY: startY + 3,
      head: [["Product", "Rate", "Quantity", "Total"]],
      body,
      theme: "grid",
      styles: {
        fontSize: 10,
        textColor: 20,
        lineColor: [209, 213, 219],
        lineWidth: 0.2,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: 75,
        fontStyle: "bold",
        halign: "left",
      },
      columnStyles: {
        0: { halign: "left", cellWidth: 70 },
        1: { halign: "right", cellWidth: 35 },
        2: { halign: "right", cellWidth: 40 },
        3: { halign: "right", cellWidth: 35 },
      },
      didParseCell: (data) => {
        if (data.section === "head" && data.column.index > 0) {
          data.cell.styles.halign = "right";
        }
        if (data.section === "body" && data.row.index >= body.length - 3) {
          data.cell.styles.fillColor = data.row.index === grandRow ? [243, 244, 246] : [255, 255, 255];
          if (data.column.index >= 2) data.cell.styles.halign = "right";
          if (data.row.index === grandRow) data.cell.styles.fontStyle = "bold";
        }
      },
      margin: { left: 14, right: 14 },
    });
    const placed = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    startY = (placed.lastAutoTable?.finalY ?? startY + 40) + 12;
  });

  doc.save("gst-sheet.pdf");
}
