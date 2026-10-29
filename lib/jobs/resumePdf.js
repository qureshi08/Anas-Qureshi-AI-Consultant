/**
 * Builds a real PDF of the resume tailored to one job, with pdf-lib. No browser, no print
 * dialog, no page chrome: the button downloads a finished file.
 * Every line of content comes from lib/jobs/resumeData.js, so nothing here can be invented.
 */
import { PDFDocument, PDFString, StandardFonts, rgb } from 'pdf-lib';
import { CONTACT, HEADLINES, SKILLS, EXPERIENCE, EDUCATION, projectById, DEFAULT_ORDER, DEFAULT_SUMMARY } from './resumeData.js';

const A4 = [595.28, 841.89];
const M = 42;            // page margin
const INK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.33, 0.33, 0.33);
const RULE = rgb(0.62, 0.62, 0.62);

// pdf-lib's StandardFonts use WinAnsiEncoding (basically Latin-1): any character outside that
// throws at draw time, not at a safe/catchable point. The model that drafts resume_plan.summary
// sometimes writes typographic characters (non-breaking hyphen, en/em dash, smart quotes,
// ellipsis) that WinAnsi does not cover, which 500'd every PDF download for that job (caught
// 2026-10-02 on a Tamer Healthcare row whose summary had a U+2011 non-breaking hyphen in
// "e-invoicing"). Model-drafted text is the only text here that is not from resumeData.js, so
// it is the only text that needs this; sanitize it before it ever reaches drawText.
const cleanPdfText = s => String(s || '')
  .replace(/[‐-―]/g, '-')   // hyphen/dash variants, incl. the non-breaking hyphen
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/…/g, '...')
  .replace(/[  ]/g, ' ')    // non-breaking / narrow no-break space
  .replace(/[^\x00-\xFF]/g, '');      // anything else outside Latin-1: drop rather than crash

export async function buildResumePdf(job) {
  const variant = ['se', 'ai', 'data'].includes(job?.resume_variant) ? job.resume_variant : 'se';
  const plan = job?.resume_plan || {};
  const order = Array.isArray(plan.project_order) && plan.project_order.length ? plan.project_order : DEFAULT_ORDER[variant];
  const projects = order.map(projectById).filter(Boolean).slice(0, 6);
  const lead = Array.isArray(plan.skills_lead) ? plan.skills_lead : [];
  const summary = cleanPdfText(plan.summary)
    || DEFAULT_SUMMARY;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${CONTACT.name} resume`);
  pdf.setAuthor(CONTACT.name);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage(A4);
  let y = A4[1] - M;
  const W = A4[0] - M * 2;

  const need = h => { if (y - h < M) { page = pdf.addPage(A4); y = A4[1] - M; } };

  const wrap = (text, font, size, width) => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > width && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines;
  };

  const text = (str, { font = reg, size = 9.5, color = INK, gap = 12, x = M, width = W } = {}) => {
    for (const line of wrap(str, font, size, width)) {
      need(gap);
      page.drawText(line, { x, y: y - size, size, font, color });
      y -= gap;
    }
  };

  const bullet = str => {
    const lines = wrap(str, reg, 9.5, W - 12);
    lines.forEach((line, i) => {
      need(11.6);
      if (i === 0) page.drawText('•', { x: M, y: y - 9.5, size: 9.5, font: reg, color: INK });
      page.drawText(line, { x: M + 11, y: y - 9.5, size: 9.5, font: reg, color: INK });
      y -= 11.6;
    });
  };

  const heading = str => {
    need(24);
    y -= 8;
    page.drawText(str.toUpperCase(), { x: M, y: y - 10, size: 9.5, font: bold, color: INK });
    y -= 13;
    page.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.6, color: RULE });
    y -= 7;
  };

  const rowRight = (left, right, { font = bold, size = 10 } = {}) => {
    need(13);
    page.drawText(left, { x: M, y: y - size, size, font, color: INK });
    const rw = reg.widthOfTextAtSize(right, 9);
    page.drawText(right, { x: M + W - rw, y: y - size, size: 9, font: reg, color: GREY });
    y -= 13;
  };

  // header
  need(30);
  page.drawText(CONTACT.name, { x: M, y: y - 20, size: 20, font: bold, color: INK });
  y -= 25;
  // The drafted headline names the posting's own role title (2026-10-11); variant headline is the fallback.
  text(cleanPdfText(plan.headline) || HEADLINES[variant], { font: bold, size: 10, gap: 13 });
  // Contact line with real link annotations. As plain text, PDF viewers guessed "linkedin.com/in/..."
  // was a file next to the PDF and opened nothing (Anas, 2026-10-29), so each link carries its full URI.
  const addLink = (x, yBase, w, h, uri) => {
    const annot = pdf.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x, yBase - 2, x + w, yBase + h], Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) } });
    page.node.addAnnot(pdf.context.register(annot));
  };
  const contactParts = [
    [CONTACT.email, `mailto:${CONTACT.email}`],
    [CONTACT.phone, null],
    [CONTACT.linkedin, `https://${CONTACT.linkedin}`],
    [CONTACT.site, `https://${CONTACT.site}`],
    [CONTACT.location, null],
  ];
  const cSize = 8.6;
  need(11);
  let cx = M;
  contactParts.forEach(([label, uri], i) => {
    let sep = i ? '  |  ' : '';
    if (cx + reg.widthOfTextAtSize(sep + label, cSize) > M + W && cx > M) { y -= 11; need(11); cx = M; sep = ''; }
    if (sep) { page.drawText(sep, { x: cx, y: y - cSize, size: cSize, font: reg, color: GREY }); cx += reg.widthOfTextAtSize(sep, cSize); }
    const lw = reg.widthOfTextAtSize(label, cSize);
    page.drawText(label, { x: cx, y: y - cSize, size: cSize, font: reg, color: GREY });
    if (uri) addLink(cx, y - cSize, lw, cSize, uri);
    cx += lw;
  });
  y -= 11;

  heading('Summary');
  text(summary, { gap: 12 });

  heading('Skills');
  for (const [group, items] of Object.entries(SKILLS)) {
    const inLead = lead.filter(l => items.some(i => i.toLowerCase() === String(l).toLowerCase()));
    const rest = items.filter(i => !inLead.some(l => String(l).toLowerCase() === i.toLowerCase()));
    const ordered = [...inLead, ...rest];
    const labelW = bold.widthOfTextAtSize(`${group}: `, 9.5);
    const lines = wrap(ordered.join(', '), reg, 9.5, W - labelW);
    lines.forEach((line, i) => {
      need(12);
      if (i === 0) page.drawText(`${group}: `, { x: M, y: y - 9.5, size: 9.5, font: bold, color: INK });
      page.drawText(line, { x: i === 0 ? M + labelW : M, y: y - 9.5, size: 9.5, font: reg, color: INK });
      y -= 12;
    });
  }

  heading('Experience');
  rowRight(EXPERIENCE.company, EXPERIENCE.dates);
  text(EXPERIENCE.title, { font: italic, size: 9.2, color: GREY, gap: 12 });
  EXPERIENCE.bullets.forEach(bullet);

  heading('Projects');
  for (const p of projects) {
    need(34);
    rowRight(p.name, p.year);
    text(`Stack: ${p.stack}`, { font: italic, size: 9, color: GREY, gap: 11.5 });
    p.bullets.forEach(bullet);
    y -= 4;
  }

  heading('Education');
  text(EDUCATION);

  return pdf.save();
}

export function resumeFileName(job) {
  const co = (job?.company || 'Resume').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 34);
  return `Anas_Qureshi_${co || 'Resume'}.pdf`;
}
