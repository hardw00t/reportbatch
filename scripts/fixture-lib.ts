import { PDFDocument, PDFName, PDFRawStream, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { PDFFont } from 'pdf-lib';

export interface FixtureReport { date: string; author: string; type: string; pages?: number; missingType?: boolean; duplicateAuthor?: boolean }
export const SAMPLE_REPORTS: FixtureReport[] = [
  { date: '2026-10-12', author: 'Alex Morgan', type: 'Site visit' },
  { date: '2026-10-13', author: 'Casey Reed', type: 'Inspection' },
  { date: '12/10/2026', author: 'Zoë Martin', type: 'Survey' },
  { date: '2026-10-15', author: 'Jordan Lee', type: 'Progress' },
];
export async function makeFixture(reports: FixtureReport[] = SAMPLE_REPORTS, options: { rotate?: number; crop?: boolean; mixed?: boolean; font?: Uint8Array; fontkit?: unknown } = {}) {
  const pdf = await PDFDocument.create();
  pdf.setTitle('Synthetic reports — ReportBatch fixtures'); pdf.setCreator('ReportBatch synthetic fixture generator');
  pdf.setCreationDate(new Date('2000-01-01T00:00:00Z')); pdf.setModificationDate(new Date('2000-01-01T00:00:00Z'));
  let regular: PDFFont;
  if (options.font) { pdf.registerFontkit(options.fontkit as Parameters<PDFDocument['registerFontkit']>[0]); regular = await pdf.embedFont(options.font, { subset: true }); }
  else regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = options.font ? regular : await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(.13,.32,.24), grey = rgb(.39,.44,.41);
  let index = 0;
  for (const [reportIndex, report] of reports.entries()) {
    for (let continuation=0; continuation<(report.pages ?? 1); continuation++) {
      const page = pdf.addPage(options.mixed && index%2 ? [595,842] : [612,792]);
      const { width, height } = page.getSize();
      const draw = (text: string,x: number,y: number,size=11,font=regular,color=green) => page.drawText(text,{x,y,size,font,color});
      page.drawRectangle({x:0,y:height-12,width,height:12,color:green});
      if (!continuation) draw('REPORT START',52,height-43,8,bold,grey);
      draw('NORTHLINE / FIELD OPERATIONS',52,height-70,8,bold,grey);
      draw(continuation ? 'Site report — continued' : 'Weekly site report',52,height-105,24,bold);
      page.drawLine({start:{x:52,y:height-124},end:{x:width-52,y:height-124},color:rgb(.78,.84,.75),thickness:1});
      if (!continuation) {
        draw(`Date: ${report.date}`,52,height-157,12);
        draw(`Author: ${report.author}`,52,height-184,12);
        if (report.duplicateAuthor) draw('Author: Another Person',52,height-205,12);
        if (!report.missingType) draw(`Type: ${report.type}`,52,height-232,12);
      }
      draw('FIELD NOTES',52,height-330,9,bold,grey);
      draw(`Fictional report ${reportIndex+1}. No customer data is included.`,52,height-360,11);
      draw(`This is source page ${index+1}, report page ${continuation+1}.`,52,height-385,11);
      draw('Author: this body line is outside the default header region.',52,height-410,10,regular,grey);
      draw('REPORT START',52,height-440,9,regular,grey);
      draw('Dates are content: 03/04/2026 is not interpreted as a locale.',52,height-465,10,regular,grey);
      for(let line=0;line<4;line++)page.drawLine({start:{x:52,y:height-500-line*22},end:{x:width-52-(line%2)*70,y:height-500-line*22},color:rgb(.87,.9,.85),thickness:1});
      draw(`PAGE-LINEAGE-${String(index+1).padStart(3,'0')}`,52,46,8,regular,grey);
      draw('SYNTHETIC SAMPLE / REPORTBATCH',width-245,46,7,regular,grey);
      if (options.crop) page.setCropBox(30,30,width-60,height-60);
      if (options.rotate) page.setRotation(degrees(options.rotate));
      index++;
    }
  }
  return pdf.save({useObjectStreams:false});
}
export async function makeSizedFixture(byteLength: number) {
  const base = await makeFixture([SAMPLE_REPORTS[0]]);
  let payloadSize = Math.max(0,byteLength-base.length-250), result: Uint8Array;
  for (let i=0;i<6;i++) {
    const pdf = await PDFDocument.load(base,{updateMetadata:false});
    const payload = new Uint8Array(payloadSize).fill(32); payload[0]=37; payload[payload.length-1]=10;
    const stream = PDFRawStream.of(pdf.context.obj({}),payload);
    pdf.getPage(0).node.addContentStream(pdf.context.register(stream));
    result = await pdf.save({useObjectStreams:false});
    if(result.byteLength===byteLength)return result;
    payloadSize+=byteLength-result.byteLength;
  }
  throw new Error('Could not construct exact-size fixture');
}
export async function makeUnsupported(kind: 'form' | 'attachment' | 'action' | 'annotation' | 'signature' | 'layer' | 'scan') {
  const pdf = await PDFDocument.load(await makeFixture([SAMPLE_REPORTS[0]]),{updateMetadata:false});
  const obj = pdf.context;
  if(kind==='form')pdf.getForm().createTextField('synthetic-field').addToPage(pdf.getPage(0));
  if(kind==='attachment')await pdf.attach(new TextEncoder().encode('synthetic attachment'),'sample.txt');
  if(kind==='action')pdf.catalog.set(PDFName.of('OpenAction'),obj.obj({S:'JavaScript',JS:'void(0)'}));
  if(kind==='annotation')pdf.getPage(0).node.set(PDFName.of('Annots'),obj.obj([obj.register(obj.obj({Type:'Annot',Subtype:'Link',Rect:[20,20,40,40],A:{S:'URI',URI:'https://example.invalid'}}))]));
  if(kind==='signature')pdf.catalog.set(PDFName.of('Perms'),obj.obj({DocMDP:obj.obj({Type:'Sig'})}));
  if(kind==='layer')pdf.catalog.set(PDFName.of('OCProperties'),obj.obj({}));
  if(kind==='scan') {const clean=await PDFDocument.create();clean.addPage([612,792]).drawRectangle({x:25,y:25,width:560,height:740,color:rgb(.9,.9,.9)});return clean.save();}
  return pdf.save({useObjectStreams:false});
}
