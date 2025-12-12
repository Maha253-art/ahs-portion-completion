import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
}

// Export to Excel
export function exportToExcel(data: ExportData, filename: string) {
  const workbook = XLSX.utils.book_new();

  // Create worksheet data with headers
  const worksheetData = [data.headers, ...data.rows];
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, data.title || 'Report');

  // Generate and download file
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Export to PDF
export function exportToPDF(data: ExportData, filename: string) {
  const doc = new jsPDF();

  // Add title
  if (data.title) {
    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74); // Green color
    doc.text(data.title, 14, 20);
  }

  // Add date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

  // Add table
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: 35,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    margin: { top: 35 },
  });

  // Save the PDF
  doc.save(`${filename}.pdf`);
}

// Export to CSV
export function exportToCSV(data: ExportData, filename: string) {
  const csvContent = [
    data.headers.join(','),
    ...data.rows.map(row =>
      row.map(cell => {
        // Handle cells that might contain commas
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
