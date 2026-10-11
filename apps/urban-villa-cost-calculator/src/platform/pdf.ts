/**
 * Build an A4 PDF from the on-screen report, one page per `.rpage` section.
 * The browser lays out and shapes the text (Arabic included) and each page is captured as an image,
 * so the PDF matches the screen exactly. Used where the print dialog is unavailable.
 */
export async function reportToPdf(report: HTMLElement): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const root = document.documentElement;
  root.classList.add('pdf-capture');
  try {
    await document.fonts?.ready;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const pages = Array.from(report.querySelectorAll<HTMLElement>('.rpage'));
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const pageW = 210, pageH = 297, margin = 10;
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
      const img = canvas.toDataURL('image/jpeg', 0.92);
      let w = pageW - margin * 2;
      let h = (canvas.height / canvas.width) * w;
      if (h > pageH - margin * 2) {
        h = pageH - margin * 2;
        w = (canvas.width / canvas.height) * h;
      }
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'JPEG', (pageW - w) / 2, margin, w, h);
    }
    return pdf.output('blob');
  } finally {
    root.classList.remove('pdf-capture');
  }
}
