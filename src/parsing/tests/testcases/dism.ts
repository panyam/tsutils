export default {
  Grammar: `
    pgm
        -> instlist
        ;

    instlist
        -> label COLON inst instlist
        | inst instlist
        | 
        ;

    inst
        -> ADD intt intt intt
        | SUB intt intt intt
        | MUL intt intt intt
        | MOV intt intt
        | LOD intt intt intt
        | STR intt intt intt
        | JMP intt intt intt
        | BEQ intt intt intt
        | BLT intt intt intt
        | RDN intt
        | PTN intt
        | HLT intt
        ;

    label
        -> LABEL
        ;

    intt
        -> INT
        | label
        ;
    `,
  SLR1ParseTable: {
    "0": {
      pgm: ["1"],
      instlist: ["2"],
      label: ["3"],
      inst: ["4"],
      ADD: ["S5"],
      SUB: ["S6"],
      MUL: ["S7"],
      MOV: ["S8"],
      LOD: ["S9"],
      STR: ["S10"],
      JMP: ["S11"],
      BEQ: ["S12"],
      BLT: ["S13"],
      RDN: ["S14"],
      PTN: ["S15"],
      HLT: ["S16"],
      LABEL: ["S17"],
      "<EOF>": ["R <instlist -> >"],
    },
    "1": { "<EOF>": ["Acc"] },
    "2": { "<EOF>": ["R <pgm -> instlist>"] },
    "3": { COLON: ["S18"] },
    "4": {
      instlist: ["19"],
      label: ["3"],
      inst: ["4"],
      ADD: ["S5"],
      SUB: ["S6"],
      MUL: ["S7"],
      MOV: ["S8"],
      LOD: ["S9"],
      STR: ["S10"],
      JMP: ["S11"],
      BEQ: ["S12"],
      BLT: ["S13"],
      RDN: ["S14"],
      PTN: ["S15"],
      HLT: ["S16"],
      LABEL: ["S17"],
      "<EOF>": ["R <instlist -> >"],
    },
    "5": { label: ["20"], intt: ["21"], LABEL: ["S22"], INT: ["S23"] },
    "6": { label: ["20"], intt: ["24"], LABEL: ["S22"], INT: ["S23"] },
    "7": { label: ["20"], intt: ["25"], LABEL: ["S22"], INT: ["S23"] },
    "8": { label: ["20"], intt: ["26"], LABEL: ["S22"], INT: ["S23"] },
    "9": { label: ["20"], intt: ["27"], LABEL: ["S22"], INT: ["S23"] },
    "10": { label: ["20"], intt: ["28"], LABEL: ["S22"], INT: ["S23"] },
    "11": { label: ["20"], intt: ["29"], LABEL: ["S22"], INT: ["S23"] },
    "12": { label: ["20"], intt: ["30"], LABEL: ["S22"], INT: ["S23"] },
    "13": { label: ["20"], intt: ["31"], LABEL: ["S22"], INT: ["S23"] },
    "14": { label: ["32"], intt: ["33"], LABEL: ["S34"], INT: ["S35"] },
    "15": { label: ["32"], intt: ["36"], LABEL: ["S34"], INT: ["S35"] },
    "16": { label: ["32"], intt: ["37"], LABEL: ["S34"], INT: ["S35"] },
    "17": { COLON: ["R <label -> LABEL>"] },
    "18": {
      inst: ["38"],
      ADD: ["S5"],
      SUB: ["S6"],
      MUL: ["S7"],
      MOV: ["S8"],
      LOD: ["S9"],
      STR: ["S10"],
      JMP: ["S11"],
      BEQ: ["S12"],
      BLT: ["S13"],
      RDN: ["S14"],
      PTN: ["S15"],
      HLT: ["S16"],
    },
    "19": { "<EOF>": ["R <instlist -> inst instlist>"] },
    "20": { LABEL: ["R <intt -> label>"], INT: ["R <intt -> label>"] },
    "21": { label: ["20"], intt: ["39"], LABEL: ["S22"], INT: ["S23"] },
    "22": { LABEL: ["R <label -> LABEL>"], INT: ["R <label -> LABEL>"] },
    "23": { LABEL: ["R <intt -> INT>"], INT: ["R <intt -> INT>"] },
    "24": { label: ["20"], intt: ["40"], LABEL: ["S22"], INT: ["S23"] },
    "25": { label: ["20"], intt: ["41"], LABEL: ["S22"], INT: ["S23"] },
    "26": { label: ["32"], intt: ["42"], LABEL: ["S34"], INT: ["S35"] },
    "27": { label: ["20"], intt: ["43"], LABEL: ["S22"], INT: ["S23"] },
    "28": { label: ["20"], intt: ["44"], LABEL: ["S22"], INT: ["S23"] },
    "29": { label: ["20"], intt: ["45"], LABEL: ["S22"], INT: ["S23"] },
    "30": { label: ["20"], intt: ["46"], LABEL: ["S22"], INT: ["S23"] },
    "31": { label: ["20"], intt: ["47"], LABEL: ["S22"], INT: ["S23"] },
    "32": {
      ADD: ["R <intt -> label>"],
      SUB: ["R <intt -> label>"],
      MUL: ["R <intt -> label>"],
      MOV: ["R <intt -> label>"],
      LOD: ["R <intt -> label>"],
      STR: ["R <intt -> label>"],
      JMP: ["R <intt -> label>"],
      BEQ: ["R <intt -> label>"],
      BLT: ["R <intt -> label>"],
      RDN: ["R <intt -> label>"],
      PTN: ["R <intt -> label>"],
      HLT: ["R <intt -> label>"],
      LABEL: ["R <intt -> label>"],
      "<EOF>": ["R <intt -> label>"],
    },
    "33": {
      ADD: ["R <inst -> RDN intt>"],
      SUB: ["R <inst -> RDN intt>"],
      MUL: ["R <inst -> RDN intt>"],
      MOV: ["R <inst -> RDN intt>"],
      LOD: ["R <inst -> RDN intt>"],
      STR: ["R <inst -> RDN intt>"],
      JMP: ["R <inst -> RDN intt>"],
      BEQ: ["R <inst -> RDN intt>"],
      BLT: ["R <inst -> RDN intt>"],
      RDN: ["R <inst -> RDN intt>"],
      PTN: ["R <inst -> RDN intt>"],
      HLT: ["R <inst -> RDN intt>"],
      LABEL: ["R <inst -> RDN intt>"],
      "<EOF>": ["R <inst -> RDN intt>"],
    },
    "34": {
      ADD: ["R <label -> LABEL>"],
      SUB: ["R <label -> LABEL>"],
      MUL: ["R <label -> LABEL>"],
      MOV: ["R <label -> LABEL>"],
      LOD: ["R <label -> LABEL>"],
      STR: ["R <label -> LABEL>"],
      JMP: ["R <label -> LABEL>"],
      BEQ: ["R <label -> LABEL>"],
      BLT: ["R <label -> LABEL>"],
      RDN: ["R <label -> LABEL>"],
      PTN: ["R <label -> LABEL>"],
      HLT: ["R <label -> LABEL>"],
      LABEL: ["R <label -> LABEL>"],
      "<EOF>": ["R <label -> LABEL>"],
    },
    "35": {
      ADD: ["R <intt -> INT>"],
      SUB: ["R <intt -> INT>"],
      MUL: ["R <intt -> INT>"],
      MOV: ["R <intt -> INT>"],
      LOD: ["R <intt -> INT>"],
      STR: ["R <intt -> INT>"],
      JMP: ["R <intt -> INT>"],
      BEQ: ["R <intt -> INT>"],
      BLT: ["R <intt -> INT>"],
      RDN: ["R <intt -> INT>"],
      PTN: ["R <intt -> INT>"],
      HLT: ["R <intt -> INT>"],
      LABEL: ["R <intt -> INT>"],
      "<EOF>": ["R <intt -> INT>"],
    },
    "36": {
      ADD: ["R <inst -> PTN intt>"],
      SUB: ["R <inst -> PTN intt>"],
      MUL: ["R <inst -> PTN intt>"],
      MOV: ["R <inst -> PTN intt>"],
      LOD: ["R <inst -> PTN intt>"],
      STR: ["R <inst -> PTN intt>"],
      JMP: ["R <inst -> PTN intt>"],
      BEQ: ["R <inst -> PTN intt>"],
      BLT: ["R <inst -> PTN intt>"],
      RDN: ["R <inst -> PTN intt>"],
      PTN: ["R <inst -> PTN intt>"],
      HLT: ["R <inst -> PTN intt>"],
      LABEL: ["R <inst -> PTN intt>"],
      "<EOF>": ["R <inst -> PTN intt>"],
    },
    "37": {
      ADD: ["R <inst -> HLT intt>"],
      SUB: ["R <inst -> HLT intt>"],
      MUL: ["R <inst -> HLT intt>"],
      MOV: ["R <inst -> HLT intt>"],
      LOD: ["R <inst -> HLT intt>"],
      STR: ["R <inst -> HLT intt>"],
      JMP: ["R <inst -> HLT intt>"],
      BEQ: ["R <inst -> HLT intt>"],
      BLT: ["R <inst -> HLT intt>"],
      RDN: ["R <inst -> HLT intt>"],
      PTN: ["R <inst -> HLT intt>"],
      HLT: ["R <inst -> HLT intt>"],
      LABEL: ["R <inst -> HLT intt>"],
      "<EOF>": ["R <inst -> HLT intt>"],
    },
    "38": {
      instlist: ["48"],
      label: ["3"],
      inst: ["4"],
      ADD: ["S5"],
      SUB: ["S6"],
      MUL: ["S7"],
      MOV: ["S8"],
      LOD: ["S9"],
      STR: ["S10"],
      JMP: ["S11"],
      BEQ: ["S12"],
      BLT: ["S13"],
      RDN: ["S14"],
      PTN: ["S15"],
      HLT: ["S16"],
      LABEL: ["S17"],
      "<EOF>": ["R <instlist -> >"],
    },
    "39": { label: ["32"], intt: ["49"], LABEL: ["S34"], INT: ["S35"] },
    "40": { label: ["32"], intt: ["50"], LABEL: ["S34"], INT: ["S35"] },
    "41": { label: ["32"], intt: ["51"], LABEL: ["S34"], INT: ["S35"] },
    "42": {
      ADD: ["R <inst -> MOV intt intt>"],
      SUB: ["R <inst -> MOV intt intt>"],
      MUL: ["R <inst -> MOV intt intt>"],
      MOV: ["R <inst -> MOV intt intt>"],
      LOD: ["R <inst -> MOV intt intt>"],
      STR: ["R <inst -> MOV intt intt>"],
      JMP: ["R <inst -> MOV intt intt>"],
      BEQ: ["R <inst -> MOV intt intt>"],
      BLT: ["R <inst -> MOV intt intt>"],
      RDN: ["R <inst -> MOV intt intt>"],
      PTN: ["R <inst -> MOV intt intt>"],
      HLT: ["R <inst -> MOV intt intt>"],
      LABEL: ["R <inst -> MOV intt intt>"],
      "<EOF>": ["R <inst -> MOV intt intt>"],
    },
    "43": { label: ["32"], intt: ["52"], LABEL: ["S34"], INT: ["S35"] },
    "44": { label: ["32"], intt: ["53"], LABEL: ["S34"], INT: ["S35"] },
    "45": { label: ["32"], intt: ["54"], LABEL: ["S34"], INT: ["S35"] },
    "46": { label: ["32"], intt: ["55"], LABEL: ["S34"], INT: ["S35"] },
    "47": { label: ["32"], intt: ["56"], LABEL: ["S34"], INT: ["S35"] },
    "48": { "<EOF>": ["R <instlist -> label COLON inst instlist>"] },
    "49": {
      ADD: ["R <inst -> ADD intt intt intt>"],
      SUB: ["R <inst -> ADD intt intt intt>"],
      MUL: ["R <inst -> ADD intt intt intt>"],
      MOV: ["R <inst -> ADD intt intt intt>"],
      LOD: ["R <inst -> ADD intt intt intt>"],
      STR: ["R <inst -> ADD intt intt intt>"],
      JMP: ["R <inst -> ADD intt intt intt>"],
      BEQ: ["R <inst -> ADD intt intt intt>"],
      BLT: ["R <inst -> ADD intt intt intt>"],
      RDN: ["R <inst -> ADD intt intt intt>"],
      PTN: ["R <inst -> ADD intt intt intt>"],
      HLT: ["R <inst -> ADD intt intt intt>"],
      LABEL: ["R <inst -> ADD intt intt intt>"],
      "<EOF>": ["R <inst -> ADD intt intt intt>"],
    },
    "50": {
      ADD: ["R <inst -> SUB intt intt intt>"],
      SUB: ["R <inst -> SUB intt intt intt>"],
      MUL: ["R <inst -> SUB intt intt intt>"],
      MOV: ["R <inst -> SUB intt intt intt>"],
      LOD: ["R <inst -> SUB intt intt intt>"],
      STR: ["R <inst -> SUB intt intt intt>"],
      JMP: ["R <inst -> SUB intt intt intt>"],
      BEQ: ["R <inst -> SUB intt intt intt>"],
      BLT: ["R <inst -> SUB intt intt intt>"],
      RDN: ["R <inst -> SUB intt intt intt>"],
      PTN: ["R <inst -> SUB intt intt intt>"],
      HLT: ["R <inst -> SUB intt intt intt>"],
      LABEL: ["R <inst -> SUB intt intt intt>"],
      "<EOF>": ["R <inst -> SUB intt intt intt>"],
    },
    "51": {
      ADD: ["R <inst -> MUL intt intt intt>"],
      SUB: ["R <inst -> MUL intt intt intt>"],
      MUL: ["R <inst -> MUL intt intt intt>"],
      MOV: ["R <inst -> MUL intt intt intt>"],
      LOD: ["R <inst -> MUL intt intt intt>"],
      STR: ["R <inst -> MUL intt intt intt>"],
      JMP: ["R <inst -> MUL intt intt intt>"],
      BEQ: ["R <inst -> MUL intt intt intt>"],
      BLT: ["R <inst -> MUL intt intt intt>"],
      RDN: ["R <inst -> MUL intt intt intt>"],
      PTN: ["R <inst -> MUL intt intt intt>"],
      HLT: ["R <inst -> MUL intt intt intt>"],
      LABEL: ["R <inst -> MUL intt intt intt>"],
      "<EOF>": ["R <inst -> MUL intt intt intt>"],
    },
    "52": {
      ADD: ["R <inst -> LOD intt intt intt>"],
      SUB: ["R <inst -> LOD intt intt intt>"],
      MUL: ["R <inst -> LOD intt intt intt>"],
      MOV: ["R <inst -> LOD intt intt intt>"],
      LOD: ["R <inst -> LOD intt intt intt>"],
      STR: ["R <inst -> LOD intt intt intt>"],
      JMP: ["R <inst -> LOD intt intt intt>"],
      BEQ: ["R <inst -> LOD intt intt intt>"],
      BLT: ["R <inst -> LOD intt intt intt>"],
      RDN: ["R <inst -> LOD intt intt intt>"],
      PTN: ["R <inst -> LOD intt intt intt>"],
      HLT: ["R <inst -> LOD intt intt intt>"],
      LABEL: ["R <inst -> LOD intt intt intt>"],
      "<EOF>": ["R <inst -> LOD intt intt intt>"],
    },
    "53": {
      ADD: ["R <inst -> STR intt intt intt>"],
      SUB: ["R <inst -> STR intt intt intt>"],
      MUL: ["R <inst -> STR intt intt intt>"],
      MOV: ["R <inst -> STR intt intt intt>"],
      LOD: ["R <inst -> STR intt intt intt>"],
      STR: ["R <inst -> STR intt intt intt>"],
      JMP: ["R <inst -> STR intt intt intt>"],
      BEQ: ["R <inst -> STR intt intt intt>"],
      BLT: ["R <inst -> STR intt intt intt>"],
      RDN: ["R <inst -> STR intt intt intt>"],
      PTN: ["R <inst -> STR intt intt intt>"],
      HLT: ["R <inst -> STR intt intt intt>"],
      LABEL: ["R <inst -> STR intt intt intt>"],
      "<EOF>": ["R <inst -> STR intt intt intt>"],
    },
    "54": {
      ADD: ["R <inst -> JMP intt intt intt>"],
      SUB: ["R <inst -> JMP intt intt intt>"],
      MUL: ["R <inst -> JMP intt intt intt>"],
      MOV: ["R <inst -> JMP intt intt intt>"],
      LOD: ["R <inst -> JMP intt intt intt>"],
      STR: ["R <inst -> JMP intt intt intt>"],
      JMP: ["R <inst -> JMP intt intt intt>"],
      BEQ: ["R <inst -> JMP intt intt intt>"],
      BLT: ["R <inst -> JMP intt intt intt>"],
      RDN: ["R <inst -> JMP intt intt intt>"],
      PTN: ["R <inst -> JMP intt intt intt>"],
      HLT: ["R <inst -> JMP intt intt intt>"],
      LABEL: ["R <inst -> JMP intt intt intt>"],
      "<EOF>": ["R <inst -> JMP intt intt intt>"],
    },
    "55": {
      ADD: ["R <inst -> BEQ intt intt intt>"],
      SUB: ["R <inst -> BEQ intt intt intt>"],
      MUL: ["R <inst -> BEQ intt intt intt>"],
      MOV: ["R <inst -> BEQ intt intt intt>"],
      LOD: ["R <inst -> BEQ intt intt intt>"],
      STR: ["R <inst -> BEQ intt intt intt>"],
      JMP: ["R <inst -> BEQ intt intt intt>"],
      BEQ: ["R <inst -> BEQ intt intt intt>"],
      BLT: ["R <inst -> BEQ intt intt intt>"],
      RDN: ["R <inst -> BEQ intt intt intt>"],
      PTN: ["R <inst -> BEQ intt intt intt>"],
      HLT: ["R <inst -> BEQ intt intt intt>"],
      LABEL: ["R <inst -> BEQ intt intt intt>"],
      "<EOF>": ["R <inst -> BEQ intt intt intt>"],
    },
    "56": {
      ADD: ["R <inst -> BLT intt intt intt>"],
      SUB: ["R <inst -> BLT intt intt intt>"],
      MUL: ["R <inst -> BLT intt intt intt>"],
      MOV: ["R <inst -> BLT intt intt intt>"],
      LOD: ["R <inst -> BLT intt intt intt>"],
      STR: ["R <inst -> BLT intt intt intt>"],
      JMP: ["R <inst -> BLT intt intt intt>"],
      BEQ: ["R <inst -> BLT intt intt intt>"],
      BLT: ["R <inst -> BLT intt intt intt>"],
      RDN: ["R <inst -> BLT intt intt intt>"],
      PTN: ["R <inst -> BLT intt intt intt>"],
      HLT: ["R <inst -> BLT intt intt intt>"],
      LABEL: ["R <inst -> BLT intt intt intt>"],
      "<EOF>": ["R <inst -> BLT intt intt intt>"],
    },
  },
};
