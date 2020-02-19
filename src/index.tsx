import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container";
import CssBaseline from "@material-ui/core/CssBaseline";
import FormControl from "@material-ui/core/FormControl";
import Grid from "@material-ui/core/Grid";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import TextField from "@material-ui/core/TextField";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import TextareaAutosize from "@material-ui/core/TextareaAutosize";
import { TransitionAlert } from "./alert";
import { wasmWorker, WaitWasmInitialize } from "./wait-wasm-initialize";
import { TokenizeResultValue } from "./worker";
import stringify from "json-stringify-pretty-compact";

const defaultSystemDicTarGzURL =
  "https://files.pythonhosted.org/packages/48/da/d1e7c16bdc178bc4209e69ff059c6602389bedb7407eb5d7887bac1922b1/SudachiDict_small-20191030.tar.gz";
const defaultCharDefRL =
  "https://raw.githubusercontent.com/Yasu-umi/sudachiclone-rs/master/src/resources/char.def";

const SysDicURLInputComp = (disabled: boolean): [string, JSX.Element] => {
  const [systemDicTarGzURL, setSystemDicTarGzURL] = useState(
    defaultSystemDicTarGzURL
  );
  return [
    systemDicTarGzURL,
    <Input
      onChange={ev => setSystemDicTarGzURL(ev.currentTarget.value)}
      value={systemDicTarGzURL}
      disabled={disabled}
      style={{ width: "25vw" }}
    />
  ];
};

const CharDefURLInputComp = (disabled: boolean): [string, JSX.Element] => {
  const [charDefURL, setCharDefURL] = useState(defaultCharDefRL);
  return [
    charDefURL,
    <Input
      onChange={ev => setCharDefURL(ev.currentTarget.value)}
      value={charDefURL}
      disabled={disabled}
      style={{ width: "25vw" }}
    />
  ];
};

const ActionButtonComp = ({
  action,
  props
}: {
  action: () => Promise<void>;
  props: Omit<Parameters<typeof Button>[0], "action">;
}): [boolean, JSX.Element] => {
  const [waiting, setWaiting] = useState(false);
  const onClick = () => {
    if (waiting) {
      return;
    }
    setWaiting(true);
    action()
      .then(() => setWaiting(false))
      .catch(() => setWaiting(false));
  };
  return [
    waiting,
    <Button
      {...props}
      onClick={onClick}
      disabled={props.disabled || waiting}
    ></Button>
  ];
};

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const [results, setResults] = useState<TokenizeResultValue[]>([]);

  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, ReadDicButton] = ActionButtonComp({
    props: { children: "Load Dic", color: "primary", variant: "contained" },
    action: async () => {
      const { error } = await wasmWorker.readFromBin(sysDicURL, charDefURL);
      setLoadErr(error);
      if (!error || error.length === 0) {
        setLoaded(true);
      }
    }
  });

  const [tokenizeErr, setTokenizeErr] = useState<string | null>(null);

  const [_, TokenizeButton] = ActionButtonComp({
    props: {
      children: "Tokenize",
      disabled: loading || !loaded,
      color: "primary",
      variant: "contained"
    },
    action: async () => {
      const result = await wasmWorker.tokenize(text);
      if (result.type === "error") {
        setTokenizeErr(result.error);
      } else if (result.type === "results") {
        setResults(result.results);
        setTokenizeErr(null);
      }
    }
  });

  const [sysDicURL, SysDicURLInput] = SysDicURLInputComp(loading);
  const [charDefURL, CharDefURLInput] = CharDefURLInputComp(loading);

  const [text, setText] = useState("我輩は猫である。");

  return (
    <>
      <CssBaseline />
      <Container>
        <Grid
          container
          direction="column"
          justify="center"
          alignItems="center"
          spacing={1}
        >
          <Grid item>
            <h1>sudachiclone-rs wasm demo</h1>
          </Grid>
          <Grid item>
            <div>this is <a href="https://github.com/Yasu-umi/sudachiclone-rs">sudachiclone-rs</a> wasm demo.</div>
            <div>1. push load dic btn.</div>
            <div>3. wait 10 sec patiently.</div>
            <div>3. type sentence.</div>
            <div>4. push tokenize btn.</div>
          </Grid>
          <WaitWasmInitialize>
            <Grid item>
              <FormControl>
                <InputLabel>SystemDictionaryTarGzURL</InputLabel>
                {SysDicURLInput}
              </FormControl>
            </Grid>
            <Grid item>
              <FormControl>
                <InputLabel>CharacterDefURL</InputLabel>
                {CharDefURLInput}
              </FormControl>
            </Grid>
            <Grid item>{ReadDicButton}</Grid>
            <Grid item>
              <TextField
                disabled={loading}
                placeholder="我輩は猫である。"
                multiline
                rows={5}
                value={text}
                onChange={ev => setText(ev.currentTarget.value)}
                style={{ width: "25vw" }}
              />
            </Grid>
            <Grid item>{TokenizeButton}</Grid>
            <Grid item>
              {results.length > 0 ? (
                <TextareaAutosize
                  value={stringify(results, { indent: "\t" })}
                  style={{ width: "50vw", border: "none" }}
                />
              ) : null}
            </Grid>
          </WaitWasmInitialize>
          {tokenizeErr ? (
            <TransitionAlert alert={{ severity: "error" }}>
              {tokenizeErr}
            </TransitionAlert>
          ) : null}
          {loadErr ? (
            <TransitionAlert alert={{ severity: "error" }}>
              {loadErr}
            </TransitionAlert>
          ) : null}
        </Grid>
      </Container>
    </>
  );
};

ReactDOM.render(<App />, document.getElementById("app"));
