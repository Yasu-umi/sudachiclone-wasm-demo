import React, { useEffect, useState } from "react";
import * as Comlink from "./comlink";
import { WasmModule } from "./worker";

export const wasmWorker = Comlink.wrap<WasmModule>(
  new Worker("./worker", { type: "module" })
);

export const WaitWasmInitialize = ({
  children
}: {
  children?: React.ReactNode;
}) => {
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    (async () => {
      if (initialized) {
        return;
      }
      await wasmWorker.initialize();
      setInitialized(true);
    })();
  }, []);
  return <>{initialized ? children : null}</>;
};
