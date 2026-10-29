import { FInt64 } from '../utils/fint64';
import { StringStructure } from '../structure/string-structure';

export interface ISetObject {
  getStoreString(): string;
  getString(): string;
  getInteger64(): bigint;
  getInteger(): number;
  getDouble(): number;
  getFloat(): FInt64;
  getDateTime(): Date;
  getBoolean(): boolean;
  setString(value: string): void;
  setInteger(value: number): void;
  setInteger64(value: bigint): void;
  setDouble(value: number): void;
  setFloat(value: FInt64): void;
  setDateTime(value: Date): void;
  setBoolean(value: boolean): void;
}

export interface ISub extends ISetObject {
  name: string;
  info: string;
  infoDisplay: string;
  infoToInt: number;
  infoToInt64: bigint;
  infoToDouble: number;
  infoToBoolean: boolean;
  infos: StringStructure;

  load(lps: string): void;
  load(name: string, info: string): void;
  set(other: ISub): void;
  getInfo(): string;
  getInfos(): string[];
  first(): string | null;
  last(): string | null;
  getLongHashCode(): bigint;
  getHashCode(): number;
}

export interface ILine extends ISub {
  text: string;
  textDisplay: string;
  textToInt: number;
  textToInt64: bigint;
  textToDouble: number;
  comments: string;
  texts: StringStructure;

  getText(): string;
  load(lps: string): void;
  load(name: string, info: string, text?: string, subs?: ISub[]): void;
  load(line: ILine): void;

  subs: ISub[];
  addSub(newSub: ISub): void;
  addorReplaceSub(newSub: ISub): void;
  addRange(newSubs: ISub[]): void;
  insertSub(index: number, newSub: ISub): void;
  insertRange(index: number, newSubs: ISub[]): void;
  remove(target: ISub | string): boolean;
  removeByName(subName: string): boolean;
  removeAll(subName: string): void;
  removeAt(index: number): void;
  contains(target: ISub | string): boolean;
  containsByName(value: string): boolean;
  find(subName: string): ISub | null;
  find(subName: string, subinfo: string): ISub | null;
  findInfo(subinfo: string): ISub | null;
  findAll(subName: string): ISub[];
  findAll(subName: string, subinfo: string): ISub[];
  findAllInfo(subinfo: string): ISub[];
  findorAdd(subName: string): ISub;
  searchAll(value: string): ISub[];
  search(value: string): ISub | null;
  indexOf(subName: string): number;
  indexsOf(subName: string): number[];
  /** Indexer of the C# original: finds the sub or adds an empty one. */
  get(subName: string): ISub;
  at(index: number): ISub | undefined;
  clear(): void;
  readonly count: number;
  firstSub(): ISub | null;
  lastSub(): ISub | null;
  [Symbol.iterator](): Iterator<ISub>;

  // Typed shorthands (separate names to avoid conflicts with ISetObject methods)
  getSubBool(subName: string): boolean;
  setSubBool(subName: string, value: boolean): void;
  getSubInt(subName: string, defaultValue?: number): number;
  setSubInt(subName: string, value: number): void;
  getSubInt64(subName: string, defaultValue?: bigint): bigint;
  setSubInt64(subName: string, value: bigint): void;
  getSubFloat(subName: string, defaultValue?: FInt64): FInt64;
  setSubFloat(subName: string, value: FInt64): void;
  getSubDateTime(subName: string, defaultValue?: Date): Date;
  setSubDateTime(subName: string, value: Date): void;
  getSubString(subName: string, defaultValue?: string | null): string | null;
  setSubString(subName: string, value: string | null): void;
  getSubDouble(subName: string, defaultValue?: number): number;
  setSubDouble(subName: string, value: number): void;

  toList(): ISub[];
  toString(sb?: string[]): string;
}

export interface ILpsDocument {
  assemblage: ILine[];

  addLine(newLine: ILine): void;
  addorReplaceLine(newLine: ILine): void;
  addRange(newLines: ILine[]): void;
  insertLine(index: number, newLine: ILine): void;
  insertRange(index: number, newLines: ILine[]): void;
  remove(target: ILine | string): boolean;
  removeAll(target: ILine | string): void;
  removeAt(index: number): void;
  contains(target: ILine | ISub): boolean;
  containsLine(value: string): boolean;
  containsSub(value: string): boolean;

  findLine(lineName: string): ILine | null;
  findLine(lineName: string, lineinfo: string): ILine | null;
  findLineInfo(lineinfo: string): ILine | null;
  findorAddLine(lineName: string): ILine;
  findAllLine(lineName: string): ILine[];
  findAllLine(lineName: string, lineinfo: string): ILine[];
  findAllLineInfo(lineinfo: string): ILine[];

  findSub(subName: string): ISub | null;
  findSub(subName: string, subinfo: string): ISub | null;
  findSubInfo(subinfo: string): ISub | null;
  findAllSub(subName: string): ISub[];
  findAllSub(subName: string, subinfo: string): ISub[];
  findAllSubInfo(subinfo: string): ISub[];

  searchAllLine(value: string): ILine[];
  searchLine(value: string): ILine | null;
  searchAllSub(value: string): ISub[];
  searchSub(value: string): ISub | null;

  indexOf(lineName: string): number;
  indexsOf(lineName: string): number[];

  load(lps: string): void;
  load(lines: ILine[]): void;
  first(): ILine | null;
  last(): ILine | null;
  getLongHashCode(): bigint;
  getHashCode(): number;
  toString(): string;
  /** Indexer of the C# original: finds the line or adds an empty one. */
  get(lineName: string): ILine;
  clear(): void;
  toList(): ILine[];
  [Symbol.iterator](): Iterator<ILine>;

  // Typed shorthands
  getLineBool(lineName: string): boolean;
  setLineBool(lineName: string, value: boolean): void;
  getLineInt(lineName: string, defaultValue?: number): number;
  setLineInt(lineName: string, value: number): void;
  getLineInt64(lineName: string, defaultValue?: bigint): bigint;
  setLineInt64(lineName: string, value: bigint): void;
  getLineString(lineName: string, defaultValue?: string | null): string | null;
  setLineString(lineName: string, value: string | null): void;
  getLineDouble(lineName: string, defaultValue?: number): number;
  setLineDouble(lineName: string, value: number): void;
  getLineFloat(lineName: string, defaultValue?: FInt64): FInt64;
  setLineFloat(lineName: string, value: FInt64): void;
  getLineDateTime(lineName: string, defaultValue?: Date): Date;
  setLineDateTime(lineName: string, value: Date): void;

  readonly length: number;
  readonly count: number;
}
