import { AppConfig, ChatOptions, ModelRecord, getCacheBackend } from "./config";

// Helper function to compare two arrays
export function areArraysEqual(arr1?: Array<any>, arr2?: Array<any>): boolean {
  if (!arr1 && !arr2) return true;
  if (!arr1 || !arr2) return false;
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

// Helper function to compare two objects deeply
function areObjectsEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (typeof obj1 !== typeof obj2) return false;
  if (typeof obj1 !== "object" || obj1 === null || obj2 === null) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key) || !areObjectsEqual(obj1[key], obj2[key]))
      return false;
  }
  return true;
}

// Function to compare two ModelRecord instances
export function areModelRecordsEqual(
  record1: ModelRecord,
  record2: ModelRecord,
): boolean {
    throw new Error("STUB");
}

export function areAppConfigsEqual(
  config1?: AppConfig,
  config2?: AppConfig,
): boolean {
    throw new Error("STUB");
}

export function areChatOptionsEqual(
  options1?: ChatOptions,
  options2?: ChatOptions,
): boolean {
  if (options1 === undefined || options2 === undefined) {
    return options1 === options2;
  }
  // Compare each property of ChatOptions (which are Partial<ChatConfig>)
  if (!areArraysEqual(options1.tokenizer_files, options2.tokenizer_files))
    return false;
  if (!areObjectsEqual(options1.conv_config, options2.conv_config))
    return false;
  if (options1.conv_template !== options2.conv_template) return false;
  if (options1.repetition_penalty !== options2.repetition_penalty) return false;
  if (options1.frequency_penalty !== options2.frequency_penalty) return false;
  if (options1.presence_penalty !== options2.presence_penalty) return false;
  if (options1.top_p !== options2.top_p) return false;
  if (options1.temperature !== options2.temperature) return false;
  if (options1.bos_token_id !== options2.bos_token_id) return false;

  // If all checks passed, the options are equal
  return true;
}

export function areChatOptionsListEqual(
  options1?: ChatOptions[],
  options2?: ChatOptions[],
): boolean {
  if (options1 && options2) {
    // Both defined, need to compare
    if (options1.length !== options2.length) {
      return false;
    } else {
      for (let i = 0; i < options1.length; i++) {
        if (!areChatOptionsEqual(options1[i], options2[i])) {
          return false;
        }
      }
      return true;
    }
  } else if (!options1 && !options2) {
    // Both undefined, equal
    return true;
  } else {
    // One defined, other not
    return false;
  }
}
