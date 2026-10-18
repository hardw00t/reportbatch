export interface Region { x: number; y: number; width: number; height: number }
export interface FieldRule {
  key: string;
  label: string;
  mode: 'prefix' | 'region';
  prefix: string;
  region: Region;
}
export interface Preset {
  schemaVersion: 1;
  name: string;
  fields: FieldRule[];
  grouping: { mode: 'page' | 'marker'; marker: string; region: Region };
  filenameTemplate: string;
}
export interface Token {
  text: string;
  box: Region;
  bx: number;
  by: number;
  dx: number;
  dy: number;
  advance: number;
  fontSize: number;
}
export interface TextLine { text: string; box: Region }
export interface PageText { number: number; width: number; height: number; rotation: number; tokens: Token[]; lines: TextLine[] }
export interface DocumentInfo { name: string; byteLength: number; pageCount: number; sha256: string }
export interface LoadedDocument { info: DocumentInfo; pages: PageText[]; bytes: Uint8Array }
export interface FieldResult { candidates: string[]; value: string; manual: boolean; sourcePage: number; issue?: string }
export interface OutputPlan {
  id: string;
  index: number;
  pages: number[];
  fields: Record<string, FieldResult>;
  filename: string;
  issues: string[];
  notices: string[];
}
export type Overrides = Record<string, Record<string, string>>;
export interface Analysis {
  id: string;
  document: DocumentInfo;
  preset: Preset;
  outputs: OutputPlan[];
  issues: string[];
  blockingCount: number;
  pageCount: number;
}
export interface Progress { phase: string; done: number; total: number }
export interface ManifestOutput {
  filename: string;
  sourcePages: number[];
  pageCount: number;
  sha256: string;
  fields: Record<string, FieldResult>;
  notices: string[];
}
export interface Manifest {
  schemaVersion: 1;
  application: 'ReportBatch';
  applicationVersion: string;
  analysisId: string;
  source: DocumentInfo;
  preset: Preset;
  outputs: ManifestOutput[];
  verification: { pagePartition: true; pdfsReopened: true; zipReopened: true; totalOutputPages: number };
  limitations: string[];
}
