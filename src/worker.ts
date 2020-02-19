import * as Comlink from './comlink';
import pako from "pako";
import { untarBuffer } from "./untar";
import { TokenizeResult, ErrorValue } from '../crate/pkg';
export { TokenizeResultValue, TokenizeResult, ErrorValue } from '../crate/pkg';
const wasmImport = import("../crate/pkg");

interface This {
  initialized: boolean;
  loaded: boolean;
  _read_from_bin: (system_dict_bin: Uint8Array, char_def_bin: Uint8Array) => ErrorValue;
  _tokenize: (text: string) => TokenizeResult;
}

export class WasmModule {
  readonly initialized: boolean = false;
  readonly loaded: boolean = false;

  async initialize(this: This) {
    if (this.initialized) { return }
    console.debug(new Date(), "worker: start initialize");
    const wasm = await wasmImport;
    this._read_from_bin = wasm.read_from_bin;
    this._tokenize = wasm.tokenize;
    console.debug(new Date(), "worker: loaded wasm");
    this.initialized = true;
  }

  async tokenize(this: This, text: string) {
    if (!this.initialized) {
      throw new Error("NotWasmInitialized");
    }
    if (!this.loaded) {
      throw new Error("NotDictionaryLoaded");
    }

    console.debug(new Date(), "worker: tokenize text", text);
    const result = await this._tokenize(text);
    if (result.ok) {
      return { type: "results" as "results", results: result.ok };
    } else if (result.err) {
      return { type: "error" as "error", error: result.err.error || "EmptyResponse" };
    } else {
      return { type: "error" as "error", error: "EmptyResponse" };
    }
  }

  async readFromBin(this: This, systemDicTarGzURL: string, charDefURL: string) {
    if (!this.initialized) {
      throw new Error("NotWasmInitialized");
    }
    console.debug(new Date(), "worker: read_from_bin start fetch");
    const [systemDicBin, charDefBin] = await Promise.all([
      (async () => {
        const res = await fetch(systemDicTarGzURL, { mode: "cors" });
        const buf = await res.arrayBuffer();
        const unzipArray = pako.inflate(new Uint8Array(buf));
        const files = Array.from(untarBuffer(unzipArray.buffer));
        const file = files.find((file) => file.name.includes("system.dic"))
        if (!file) { throw new Error("NotFoundSystemDic"); }
        return new Uint8Array(file.buffer);
      })(),
      (async () => {
        const res = await fetch(charDefURL, { mode: "cors" });
        const buf = await res.arrayBuffer();
        return new Uint8Array(buf);
      })()
    ]);
    console.debug(new Date(), "worker: read_from_bin finish fetch");
    console.debug(new Date(), "worker: systemDicBin.length", systemDicBin.length);
    console.debug(new Date(), "worker: charDefBin.length", charDefBin.length);
    const result = await this._read_from_bin(systemDicBin, charDefBin);
    this.loaded = true;
    return result;
  }
};

Comlink.expose(new WasmModule());
