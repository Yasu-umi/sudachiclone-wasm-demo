import * as Comlink from './comlink';
import pako from "pako";
import { untarBuffer } from "./untar";
import { TokenizeResult, ErrorValue } from '../crate/pkg';
export { TokenizeResultValue, TokenizeResult, ErrorValue } from '../crate/pkg';
const wasmImport = import("../crate/pkg");

interface This {
  initialized: boolean;
  loaded: boolean;
  _readFromBin: (system_dict_bin: Uint8Array, char_def_bin: Uint8Array) => ErrorValue;
  _tokenize: (text: string) => TokenizeResult;
}

export class WasmModule {
  readonly initialized: boolean = false;
  readonly loaded: boolean = false;

  async initialize(this: This) {
    if (this.initialized) { return }
    console.debug((new Date()).toISOString(), "worker: start initialize");
    const wasm = await wasmImport;
    this._readFromBin = wasm.read_from_bin;
    this._tokenize = wasm.tokenize;
    this.initialized = true;
    console.debug((new Date()).toISOString(), "worker: finish initialize");
  }

  async tokenize(this: This, text: string) {
    if (!this.initialized) {
      throw new Error("NotWasmInitialized");
    }
    if (!this.loaded) {
      throw new Error("NotDictionaryLoaded");
    }

    console.debug((new Date()).toISOString(), "worker: tokenize text", text);
    const result = await this._tokenize(text);
    if (result.ok) {
      console.debug((new Date()).toISOString(), "worker: tokenize results", result.ok);
      return { type: "results" as "results", results: result.ok };
    } else if (result.err) {
      console.error((new Date()).toISOString(), "worker: tokenize  error", result.err.error);
      return { type: "error" as "error", error: result.err.error || "EmptyResponse" };
    } else {
      return { type: "error" as "error", error: "EmptyResponse" };
    }
  }

  async readFromBin(this: This, systemDicTarGzURL: string, charDefURL: string) {
    if (!this.initialized) {
      throw new Error("NotWasmInitialized");
    }
    console.debug((new Date()).toISOString(), "worker: readFromBin start fetch");
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
    console.debug((new Date()).toISOString(), "worker: readFromBin finish fetch");
    console.debug((new Date()).toISOString(), "worker: systemDicBin.length", systemDicBin.length);
    console.debug((new Date()).toISOString(), "worker: charDefBin.length", charDefBin.length);
    console.debug((new Date()).toISOString(), "worker: readFromBin start load");
    const result = await this._readFromBin(systemDicBin, charDefBin);
    this.loaded = true;
    console.debug((new Date()).toISOString(), "worker: readFromBin finish load");
    return result;
  }
};

Comlink.expose(new WasmModule());
