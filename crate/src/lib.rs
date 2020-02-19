use std::io::Cursor;
use std::sync::{Arc, Mutex};

use serde_derive::Serialize;
use sudachiclone::dictionary::{Dictionary, DictionaryErr};
use sudachiclone::dictionary_lib::binary_dictionary::BinaryDictionary;
use sudachiclone::dictionary_lib::character_category::CharacterCategory;
use sudachiclone::dictionary_lib::grammar::SetCharacterCategory;
use sudachiclone::dictionary_lib::lexicon_set::LexiconSet;
use sudachiclone::morpheme::Morpheme;
use sudachiclone::tokenizer::CanTokenize;
use sudachiclone::tokenizer::Tokenizer;
use typescript_definitions::TypescriptDefinition;
use wasm_bindgen::prelude::*;

#[macro_use]
extern crate lazy_static;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

lazy_static! {
  static ref TOKENIZER: Mutex<Option<Tokenizer>> = Mutex::new(None);
}

#[derive(Serialize, TypescriptDefinition)]
pub struct TokenizeResultValue {
  surface: String,
  part_of_speech: Vec<String>,
  normalized_form: String,
  dictionary_form: String,
  reading_form: String,
  dictionary_id: i32,
  oov: bool,
}

impl TokenizeResultValue {
  pub fn new(m: &Morpheme) -> TokenizeResultValue {
    TokenizeResultValue {
      surface: m.surface(),
      part_of_speech: m.part_of_speech(),
      normalized_form: m.normalized_form().to_string(),
      dictionary_form: m.dictionary_form().to_string(),
      reading_form: m.reading_form().to_string(),
      dictionary_id: m.dictionary_id().map(|i| i as i32).unwrap_or(-1),
      oov: m.is_oov(),
    }
  }
}

#[derive(Serialize, TypescriptDefinition)]
pub struct ErrorValue {
  error: Option<String>,
}

#[derive(Serialize, TypescriptDefinition)]
pub struct TokenizeResult {
  ok: Option<Vec<TokenizeResultValue>>,
  err: Option<ErrorValue>,
}

/// return TokenizeResult
#[wasm_bindgen]
pub fn tokenize(text: String) -> JsValue {
  let result = if let Some(tokenizer) = &*TOKENIZER.lock().unwrap() {
    let vals = tokenizer
      .tokenize(text, &None, None)
      .unwrap()
      .iter()
      .map(|morpheme| TokenizeResultValue::new(&morpheme))
      .collect::<Vec<TokenizeResultValue>>();
    TokenizeResult {
      ok: Some(vals),
      err: None,
    }
  } else {
    TokenizeResult {
      ok: None,
      err: Some(ErrorValue {
        error: Some(String::from("NotInitializedTokenizer")),
      }),
    }
  };
  JsValue::from_serde(&result).unwrap()
}

/// return ErrorValue
#[wasm_bindgen]
pub fn read_from_bin(system_dict_bin: Vec<u8>, char_def_bin: Vec<u8>) -> JsValue {
  #[cfg(feature = "console_error_panic_hook")]
  console_error_panic_hook::set_once();
  let result = ErrorValue {
    error: _read_from_bin(system_dict_bin, char_def_bin)
      .map_err(|e| format!("{}", e))
      .err(),
  };
  JsValue::from_serde(&result).unwrap()
}

fn _read_from_bin(system_dict_bin: Vec<u8>, char_def_bin: Vec<u8>) -> Result<(), DictionaryErr> {
  let mut system_dict_reader = Cursor::new(system_dict_bin);
  let mut system_dictionary =
    BinaryDictionary::read_dictionary_from_reader(&mut system_dict_reader)?;

  let mut char_def_reader = Cursor::new(char_def_bin);
  let char_category =
    CharacterCategory::read_character_definition_from_reader(&mut char_def_reader)?;

  system_dictionary
    .grammar
    .set_character_category(Some(char_category));

  let lexicon_set = Arc::new(Mutex::new(LexiconSet::new(system_dictionary.lexicon)));
  let grammar = Arc::new(Mutex::new(system_dictionary.grammar));

  let dictionary = Dictionary::new(
    &grammar,
    &lexicon_set,
    &Arc::new(Vec::new()),
    &Arc::new(Vec::new()),
    &Arc::new(Vec::new()),
  );

  let tokenizer = dictionary.create();
  *TOKENIZER.lock().unwrap() = Some(tokenizer);

  Ok(())
}
