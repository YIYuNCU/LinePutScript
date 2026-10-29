import { ILine, ISub } from '../types/interfaces';
import { LineBase } from './line-base';

/**
 * Like {@link Line}, but subs are keyed by unique name (`Line_D` in the C# original):
 * adding a sub with an existing name replaces it, lookups by name are O(1).
 * Iteration keeps insertion order.
 */
export class LineDict extends LineBase {
  private _subs: Map<string, ISub> = new Map();

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

  /** A snapshot array of the subs in insertion order (not a live view). */
  get subs(): ISub[] { return Array.from(this._subs.values()); }
  set subs(value: ISub[]) {
    this._subs.clear();
    for (const sub of value) this._subs.set(sub.name, sub);
  }

  get count(): number { return this._subs.size; }

  addSub(newSub: ISub): void {
    this._subs.set(newSub.name, newSub);
  }

  addorReplaceSub(newSub: ISub): void {
    this._subs.set(newSub.name, newSub);
  }

  /** Subs have no position in a dictionary, but the order of iteration can be controlled by inserting at an index. */
  insertSub(index: number, newSub: ISub): void {
    const entries = Array.from(this._subs.values()).filter((x) => x.name !== newSub.name);
    entries.splice(index, 0, newSub);
    this.subs = entries;
  }

  /** Remove by name: the given sub's name, or a name string. */
  remove(target: ISub | string): boolean {
    return this._subs.delete(typeof target === 'string' ? target : target.name);
  }

  removeAll(subName: string): void {
    this._subs.delete(subName);
  }

  removeAt(index: number): void {
    const sub = this.at(index);
    if (sub !== undefined) this._subs.delete(sub.name);
  }

  contains(target: ISub | string): boolean {
    return this._subs.has(typeof target === 'string' ? target : target.name);
  }

  clear(): void {
    this._subs.clear();
  }

  at(index: number): ISub | undefined {
    const subs = this.subs;
    return subs[index < 0 ? subs.length + index : index];
  }

  // Dictionary lines compare the display text (GetString) when matching by info.
  find(subName: string): ISub | null;
  find(subName: string, subinfo: string): ISub | null;
  find(subName: string, subinfo?: string): ISub | null {
    const sub = this._subs.get(subName);
    if (sub === undefined) return null;
    return subinfo === undefined || sub.infoDisplay === subinfo ? sub : null;
  }

  findInfo(subinfo: string): ISub | null {
    for (const sub of this._subs.values()) if (sub.infoDisplay === subinfo) return sub;
    return null;
  }

  findAll(subName: string): ISub[];
  findAll(subName: string, subinfo: string): ISub[];
  findAll(subName: string, subinfo?: string): ISub[] {
    const sub = subinfo === undefined ? (this._subs.get(subName) ?? null) : this.find(subName, subinfo);
    return sub === null ? [] : [sub];
  }

  findAllInfo(subinfo: string): ISub[] {
    return this.subs.filter((x) => x.infoDisplay === subinfo);
  }

  indexOf(subName: string): number {
    let i = 0;
    for (const name of this._subs.keys()) {
      if (name === subName) return i;
      i++;
    }
    return -1;
  }

  indexsOf(subName: string): number[] {
    const i = this.indexOf(subName);
    return i === -1 ? [] : [i];
  }

  [Symbol.iterator](): Iterator<ISub> {
    return this._subs.values();
  }

  clone(): LineDict {
    return new LineDict(this);
  }
}
