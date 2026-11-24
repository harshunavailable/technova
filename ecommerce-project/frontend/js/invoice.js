// js/invoice.js
// Builds a clean, printable PDF invoice for a completed order using jsPDF
// (loaded from CDN in order-success.html / orders.html) and triggers a download.

function downloadInvoice({ order, items }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;

  // ---- Header ----
  doc.setFillColor(182, 255, 59); // brand volt-green
  doc.setDrawColor(16, 19, 28);
  doc.setLineWidth(1.5);
  doc.roundedRect(margin, y - 30, 34, 34, 8, 8, 'FD');
  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(16, 19, 28);
  doc.text('T', margin + 13, y - 8);

  doc.setFontSize(20).setFont('helvetica', 'bold');
  doc.text('Technova', margin + 46, y - 6);
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(90, 95, 110);
  doc.text('PC Building & CCTV Security — Tax Invoice', margin + 46, y + 8);

  doc.setFontSize(9);
  doc.text(`Invoice #: INV-${String(order.OrderID).padStart(6, '0')}`, pageWidth - margin, y - 20, { align: 'right' });
  doc.text(`Order date: ${new Date(order.OrderDate).toLocaleDateString('en-IN')}`, pageWidth - margin, y - 6, { align: 'right' });
  doc.text(`Status: ${order.Status}`, pageWidth - margin, y + 8, { align: 'right' });

  y += 34;
  doc.setDrawColor(210, 213, 224);
  doc.line(margin, y, pageWidth - margin, y);
  y += 26;

  // ---- Billing / shipping block ----
  doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(16, 19, 28);
  doc.text('Ship to', margin, y);
  doc.setFont('helvetica', 'normal').setTextColor(75, 81, 101);
  doc.text(order.ShippingLine1, margin, y + 16);
  doc.text(`${order.ShippingCity}, ${order.ShippingState} ${order.ShippingPostal}`, margin, y + 30);
  doc.text(order.ShippingCountry, margin, y + 44);

  doc.setFont('helvetica', 'bold').setTextColor(16, 19, 28);
  doc.text('Payment method', pageWidth - margin, y, { align: 'right' });
  doc.setFont('helvetica', 'normal').setTextColor(75, 81, 101);
  doc.text(order.PaymentMethod, pageWidth - margin, y + 16, { align: 'right' });

  y += 70;

  // ---- Line items table header ----
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, pageWidth - margin * 2, 26, 'F');
  doc.setFontSize(9.5).setFont('helvetica', 'bold').setTextColor(16, 19, 28);
  doc.text('Item', margin + 10, y + 17);
  doc.text('Qty', pageWidth - margin - 190, y + 17, { align: 'right' });
  doc.text('Unit price', pageWidth - margin - 100, y + 17, { align: 'right' });
  doc.text('Line total', pageWidth - margin - 10, y + 17, { align: 'right' });
  y += 26;

  doc.setFont('helvetica', 'normal').setTextColor(30, 33, 44);
  items.forEach(item => {
    doc.setFontSize(9.5);
    doc.text(item.ProductName, margin + 10, y + 17, { maxWidth: pageWidth - margin * 2 - 220 });
    doc.text(String(item.Quantity), pageWidth - margin - 190, y + 17, { align: 'right' });
    doc.text(formatMoney(item.UnitPrice), pageWidth - margin - 100, y + 17, { align: 'right' });
    doc.text(formatMoney(item.LineTotal), pageWidth - margin - 10, y + 17, { align: 'right' });
    y += 24;
    doc.setDrawColor(228, 230, 238);
    doc.line(margin, y, pageWidth - margin, y);
  });

  y += 20;
  // ---- Totals ----
  totalLine(doc, 'Subtotal', order.Subtotal, pageWidth, margin, y); y += 18;
  totalLine(doc, 'Tax (GST 18%)', order.Tax, pageWidth, margin, y); y += 18;
  totalLine(doc, 'Shipping', order.ShippingFee, pageWidth, margin, y); y += 10;
  doc.setDrawColor(16, 19, 28); doc.setLineWidth(1);
  doc.line(pageWidth - margin - 200, y, pageWidth - margin, y); y += 20;
  doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(16, 19, 28);
  doc.text('Total paid', pageWidth - margin - 200, y);
  doc.text(formatMoney(order.TotalAmount), pageWidth - margin - 10, y, { align: 'right' });

  // ---- Footer ----
  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(120, 124, 138);
  doc.text('Thank you for shopping with Technova. For support, contact support@technova.com.',
    margin, doc.internal.pageSize.getHeight() - 40);

  doc.save(`Technova-Invoice-${order.OrderID}.pdf`);
}

function totalLine(doc, label, value, pageWidth, margin, y) {
  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(75, 81, 101);
  doc.text(label, pageWidth - margin - 200, y);
  doc.text(formatMoney(value), pageWidth - margin - 10, y, { align: 'right' });
}

function formatMoney(v) {
  return 'Rs. ' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}
