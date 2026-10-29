import { ILine, ISub } from '../types/interfaces';
import { LineBase } from './line-base';

/**
 * A line: name, info, an ordered list of subs (names may repeat) and a text part
 * (`name#info:|sub#info:|sub#info:|text`).
 */
export class Line extends LineBase {
  private _subs: ISub[] = [];

  constructor();
  constructor(lpsLine: string);
  constructor(line: ILine);
  constructor(name: string, info: string, text?: string, ...subs: ISub[]);
  constructor(name: string, info: string, subs: ISub[], text?: string);
  constructor(
    nameOrLps?: string | ILine,
    info?: string,
    textOrSubs?: string | ISub[],
    ...rest: Array<ISub | string | undefined>
  ) {
    super();
    this._init(nameOrLps, info, textOrSubs, rest);
  }

  get subs(): ISub[] { return this._subs; }
  set subs(value: ISub[]) { this._subs = value; }

  get count(): number { return this._subs.length; }

  addSub(newSub: ISub): void {
    this._subs.push(newSub);
  }

  /** Copy `newSub` into the existing sub of the same name, or append it. */
  addorReplaceSub(newSub: ISub): void {
    const old = this.find(newSub.name);
    if (old !== null) old.set(newSub);
    else this._subs.push(newSub);
  }

  insertSub(index: number, newSub: ISub): void {
    this._subs.splice(index, 0, newSub);
  }

  /** Remove a sub instance, or the first sub with the given name. */
  remove(target: ISub | string): boolean {
    const subs = this._subs;
    let i = -1;
    if (typeof target === 'string') {
      for (let k = 0; k < subs.length; k++) {
        if (subs[k].name === target) {
          i = k;
          break;
        }
      }
    } else {
      i = subs.indexOf(target);
    }
    if (i === -1) return false;
    subs.splice(i, 1);
    return true;
  }

  removeAll(subName: string): void {
    const subs = this._subs;
    let w = 0;
    for (let r = 0; r < subs.length; r++) if (subs[r].name !== subName) subs[w++] = subs[r];
    subs.length = w;
  }

  removeAt(index: number): void {
    this._subs.splice(index, 1);
  }

  contains(target: ISub | string): boolean {
    if (typeof target !== 'string') return this._subs.indexOf(target) !== -1;
    const subs = this._subs;
    for (let i = 0; i < subs.length; i++) if (subs[i].name === target) return true;
    return false;
  }

  clear(): void {
    this._subs = [];
  }

  at(index: number): ISub | undefined {
    return this._subs[index < 0 ? this._subs.length + index : index];
  }

  find(subName: string): ISub | null;
  find(subName: string, subinfo: string): ISub | null;
  find(subName: string, subinfo?: string): ISub | null {
    const subs = this._subs;
    for (let i = 0; i < subs.length; i++) {
      const sub = subs[i];
      if (sub.name === subName && (subinfo === undefined || sub.info === subinfo)) return sub;
    }
    return null;
  }

  findInfo(subinfo: string): ISub | null {
    const subs = this._subs;
    for (let i = 0; i < subs.length; i++) if (subs[i].info === subinfo) return subs[i];
    return null;
  }

  findAll(subName: string): ISub[];
  findAll(subName: string, subinfo: string): ISub[];
  findAll(subName: string, subinfo?: string): ISub[] {
    return this._subs.filter((x) => x.name === subName && (subinfo === undefined || x.info === subinfo));
  }

  findAllInfo(subinfo: string): ISub[] {
    return this._subs.filter((x) => x.info === subinfo);
  }

  indexOf(subName: string): number {
    const subs = this._subs;
    for (let i = 0; i < subs.length; i++) if (subs[i].name === subName) return i;
    return -1;
  }

  indexsOf(subName: string): number[] {
    const result: number[] = [];
    const subs = this._subs;
    for (let i = 0; i < subs.length; i++) if (subs[i].name === subName) result.push(i);
    return result;
  }

  [Symbol.iterator](): Iterator<ISub> {
    return this._subs[Symbol.iterator]();
  }

  clone(): Line {
    return new Line(this);
  }
}
