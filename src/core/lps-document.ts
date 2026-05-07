import { ISub, ILine } from '../types/interfaces';
import { LPS } from './lps';
import { Sub } from './sub';
import { Line } from './line';

export class LpsDocument extends LPS {
  private _lineNode: number = 0;

  constructor();
  constructor(lps: string);
  constructor(line: ILine, ...lines: ILine[]);
  constructor(lines: ILine[]);
  constructor(lpsOrLine?: string | ILine | ILine[], ...moreLines: ILine[]) {
    super();
    if (lpsOrLine === undefined) return;
    if (typeof lpsOrLine === 'string') { this.load(lpsOrLine); }
    else if (Array.isArray(lpsOrLine)) { this.addRange(lpsOrLine); }
    else { this.addLine(lpsOrLine); this.addRange(moreLines); }
  }

  get lineNode(): number { return this._lineNode; }
  set lineNode(value: number) {
    if (value > this.assemblage.length) this._lineNode = this.assemblage.length;
    else if (value < 0) this._lineNode = 0;
    else this._lineNode = value;
  }

  readNext(): ILine | null {
    if (this._lineNode >= this.assemblage.length) return null;
    return this.assemblage[this._lineNode++];
  }

  read(): ILine | null {
    if (this._lineNode >= this.assemblage.length) return null;
    return this.assemblage[this._lineNode];
  }

  append(newLine: ILine): void;
  append(newlineName: string, info?: string, text?: string, ...subs: ISub[]): void;
  append(newLineOrName: ILine | string, info: string = '', text: string = '', ...subs: ISub[]): void {
    if (typeof newLineOrName === 'string') {
      const line = new Line();
      line.load(newLineOrName, info, text, subs);
      this.insertLine(this._lineNode + 1, line);
    } else {
      this.insertLine(this._lineNode + 1, newLineOrName);
    }
  }

  appendSub(...newSubs: ISub[]): void {
    const current = this.read();
    if (current) current.addRange(newSubs);
  }

  appendSubByName(newSubName: string, subInfo: string = ''): void {
    const current = this.read();
    if (current) {
      const sub = new Sub();
      sub.load(newSubName, subInfo);
      current.addSub(sub);
    }
  }

  readReset(): void { this._lineNode = 0; }
  readEnd(): void { this._lineNode = this.assemblage.length; }
  readCanNext(): boolean { return this._lineNode < this.assemblage.length; }
}
