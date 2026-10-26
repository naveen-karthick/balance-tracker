import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatNumber, parseAmount, type GstRow, type LineView, type SheetTotals } from "@/lib/gst";
import { encodeGstSheet, GST_PDF_COLUMN_MM, GST_PDF_MARGIN_MM } from "@/lib/gstPdfRestore";

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

export function buildGstPdf(sheets: SheetPdf[], rows: GstRow[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const sheetData = encodeGstSheet(rows);
  doc.setProperties({
    title: "GST Sheet",
    subject: sheetData,
    keywords: sheetData,
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("GST Sheet", GST_PDF_MARGIN_MM, 16);

  let startY = 22;
  sheets.forEach((sheet) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(sheet.title, GST_PDF_MARGIN_MM, startY);
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
        0: { halign: "left", cellWidth: GST_PDF_COLUMN_MM[0] },
        1: { halign: "right", cellWidth: GST_PDF_COLUMN_MM[1] },
        2: { halign: "right", cellWidth: GST_PDF_COLUMN_MM[2] },
        3: { halign: "right", cellWidth: GST_PDF_COLUMN_MM[3] },
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
      margin: { left: GST_PDF_MARGIN_MM, right: GST_PDF_MARGIN_MM },
    });
    const placed = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    startY = (placed.lastAutoTable?.finalY ?? startY + 40) + 12;
  });

  return doc;
}

export function downloadGstPdf(sheets: SheetPdf[], rows: GstRow[]) {
  buildGstPdf(sheets, rows).save("gst-sheet.pdf");
}
