import { StringMap } from "../../types";
import { assert } from "../../utils/misc";
import { Grammar } from "../grammar";
import { EBNFParser } from "../ebnf";
import { LRAction, ParseTable, LRItemGraph } from "../lrbase";
import { LR1ItemGraph } from "../lr1";
import { makeSLRParseTable, makeLRParseTable } from "../ptables";
import { verifyLRParseTable, Goto, Shift, Reduce, expectPTableActions } from "./utils";

const g1 = new EBNFParser(` `).grammar.augmentStartSymbol("S1");

describe("LR ParseTable", () => {
  test("Test Basic", () => {
    verifyLRParseTable("G1", g1, makeLRParseTable, {
      "0": { S: ["1"], C: ["2"], c: ["S3"], d: ["S4"] },
      "1": { "<EOF>": ["Acc"] },
      "2": { C: ["5"], c: ["S6"], d: ["S7"] },
      "3": { C: ["8"], c: ["S3"], d: ["S4"] },
      "4": { c: ["R <C -> d>"], d: ["R <C -> d>"] },
      "5": { "<EOF>": ["R <S -> C C>"] },
      "6": { C: ["9"], c: ["S6"], d: ["S7"] },
      "7": { "<EOF>": ["R <C -> d>"] },
      "8": { c: ["R <C -> c C>"], d: ["R <C -> c C>"] },
      "9": { "<EOF>": ["R <C -> c C>"] },
    });
  });
});

describe("LRParseTable with Conflicts", () => {
  const g2 = new EBNFParser(`
    S -> L EQ R ;
    S -> R ;
    L -> STAR R ;
    L -> id ;
    R -> L ;
  `).grammar.augmentStartSymbol("S1");
  test("Test LR Parse Table", () => {
    verifyLRParseTable("G2", g2, makeLRParseTable, {
      "0": { S: ["1"], L: ["2"], R: ["3"], STAR: ["S4"], id: ["S5"] },
      "1": { "<EOF>": ["Acc"] },
      "2": { EQ: ["S6"], "<EOF>": ["R <R -> L>"] },
      "3": { "<EOF>": ["R <S -> R>"] },
      "4": { L: ["7"], R: ["8"], STAR: ["S4"], id: ["S5"] },
      "5": { EQ: ["R <L -> id>"], "<EOF>": ["R <L -> id>"] },
      "6": { L: ["9"], R: ["10"], STAR: ["S11"], id: ["S12"] },
      "7": { EQ: ["R <R -> L>"], "<EOF>": ["R <R -> L>"] },
      "8": { EQ: ["R <L -> STAR R>"], "<EOF>": ["R <L -> STAR R>"] },
      "9": { "<EOF>": ["R <R -> L>"] },
      "10": { "<EOF>": ["R <S -> L EQ R>"] },
      "11": { L: ["9"], R: ["13"], STAR: ["S11"], id: ["S12"] },
      "12": { "<EOF>": ["R <L -> id>"] },
      "13": { "<EOF>": ["R <L -> STAR R>"] },
    });
  });
  test("Test LR Parse Table", () => {
    verifyLRParseTable("G2", g2, makeSLRParseTable, {
      "0": { S: ["1"], L: ["2"], R: ["3"], STAR: ["S4"], id: ["S5"] },
      "1": { "<EOF>": ["Acc"] },
      "2": { EQ: ["S6", "R <R -> L>"], "<EOF>": ["R <R -> L>"] },
      "3": { "<EOF>": ["R <S -> R>"] },
      "4": { L: ["7"], R: ["8"], STAR: ["S4"], id: ["S5"] },
      "5": { EQ: ["R <L -> id>"], "<EOF>": ["R <L -> id>"] },
      "6": { L: ["7"], R: ["9"], STAR: ["S4"], id: ["S5"] },
      "7": { EQ: ["R <R -> L>"], "<EOF>": ["R <R -> L>"] },
      "8": { EQ: ["R <L -> STAR R>"], "<EOF>": ["R <L -> STAR R>"] },
      "9": { "<EOF>": ["R <S -> L EQ R>"] },
    });
  });
});

const g3 = new EBNFParser(`
  S -> NP VP ;
  S -> S PP ;
  NP -> det n ;
  PP -> prep NP ;
  VP -> v NP ;
`).grammar.augmentStartSymbol("S1");

describe("LR ParseTable", () => {
  test("Test G3", () => {
    verifyLRParseTable("G3", g3, makeLRParseTable, {
      "0": { S: ["1"], NP: ["2"], det: ["S3"] },
      "1": { PP: ["4"], prep: ["S5"], "<EOF>": ["Acc"] },
      "2": { VP: ["6"], v: ["S7"] },
      "3": { n: ["S8"] },
      "4": { prep: ["R <S -> S PP>"], "<EOF>": ["R <S -> S PP>"] },
      "5": { NP: ["9"], det: ["S10"] },
      "6": { prep: ["R <S -> NP VP>"], "<EOF>": ["R <S -> NP VP>"] },
      "7": { NP: ["11"], det: ["S10"] },
      "8": { v: ["R <NP -> det n>"] },
      "9": { prep: ["R <PP -> prep NP>"], "<EOF>": ["R <PP -> prep NP>"] },
      "10": { n: ["S12"] },
      "11": { prep: ["R <VP -> v NP>"], "<EOF>": ["R <VP -> v NP>"] },
      "12": { prep: ["R <NP -> det n>"], "<EOF>": ["R <NP -> det n>"] },
    });
  });
});

const g4 = new EBNFParser(`
  S -> NP VP ;
  S -> S PP ;
  NP -> n ;
  NP -> det n ;
  NP -> NP PP ;
  PP -> prep NP ;
  VP -> v NP ;
`).grammar.augmentStartSymbol("S1");

describe("LR ParseTable", () => {
  test("Test G4", () => {
    verifyLRParseTable("4", g4, makeLRParseTable, {
      "0": { S: ["1"], NP: ["2"], n: ["S3"], det: ["S4"] },
      "1": { PP: ["5"], prep: ["S6"], "<EOF>": ["Acc"] },
      "2": { VP: ["7"], PP: ["8"], prep: ["S9"], v: ["S10"] },
      "3": { prep: ["R <NP -> n>"], v: ["R <NP -> n>"] },
      "4": { n: ["S11"] },
      "5": { prep: ["R <S -> S PP>"], "<EOF>": ["R <S -> S PP>"] },
      "6": { NP: ["12"], n: ["S13"], det: ["S14"] },
      "7": { prep: ["R <S -> NP VP>"], "<EOF>": ["R <S -> NP VP>"] },
      "8": { prep: ["R <NP -> NP PP>"], v: ["R <NP -> NP PP>"] },
      "9": { NP: ["15"], n: ["S3"], det: ["S4"] },
      "10": { NP: ["16"], n: ["S13"], det: ["S14"] },
      "11": { prep: ["R <NP -> det n>"], v: ["R <NP -> det n>"] },
      "12": {
        PP: ["17"],
        prep: ["S6", "R <PP -> prep NP>"],
        "<EOF>": ["R <PP -> prep NP>"],
      },
      "13": { prep: ["R <NP -> n>"], "<EOF>": ["R <NP -> n>"] },
      "14": { n: ["S18"] },
      "15": {
        PP: ["8"],
        prep: ["S9", "R <PP -> prep NP>"],
        v: ["R <PP -> prep NP>"],
      },
      "16": {
        PP: ["17"],
        prep: ["S6", "R <VP -> v NP>"],
        "<EOF>": ["R <VP -> v NP>"],
      },
      "17": { prep: ["R <NP -> NP PP>"], "<EOF>": ["R <NP -> NP PP>"] },
      "18": { prep: ["R <NP -> det n>"], "<EOF>": ["R <NP -> det n>"] },
    });
  });
});

const g5 = new EBNFParser(`
  S -> NP VP ;
  NP -> det n ;
  NP -> n ;
  NP -> that S ;
  VP -> be adj;
`).grammar.augmentStartSymbol("S1");

describe("LR ParseTable", () => {
  test("Test G5", () => {
    verifyLRParseTable("G5", g5, makeLRParseTable, {
      "0": {
        S: ["1"],
        NP: ["2"],
        det: ["S3"],
        n: ["S4"],
        that: ["S5"],
      },
      "1": { "<EOF>": ["Acc"] },
      "2": { VP: ["6"], be: ["S7"] },
      "3": { n: ["S8"] },
      "4": { be: ["R <NP -> n>"] },
      "5": {
        S: ["9"],
        NP: ["10"],
        det: ["S3"],
        n: ["S4"],
        that: ["S5"],
      },
      "6": { "<EOF>": ["R <S -> NP VP>"] },
      "7": { adj: ["S11"] },
      "8": { be: ["R <NP -> det n>"] },
      "9": { be: ["R <NP -> that S>"] },
      "10": { VP: ["12"], be: ["S13"] },
      "11": { "<EOF>": ["R <VP -> be adj>"] },
      "12": { be: ["R <S -> NP VP>"] },
      "13": { adj: ["S14"] },
      "14": { be: ["R <VP -> be adj>"] },
    });
  });
});

const g6 = new EBNFParser(`
  E -> E PLUS E ;
  E -> d ;
`).grammar.augmentStartSymbol("S1");

describe("LR ParseTable", () => {
  test("Test G6", () => {
    verifyLRParseTable("G6", g6, makeLRParseTable, {
      "0": { E: ["1"], d: ["S2"] },
      "1": { PLUS: ["S3"], "<EOF>": ["Acc"] },
      "2": { PLUS: ["R <E -> d>"], "<EOF>": ["R <E -> d>"] },
      "3": { E: ["4"], d: ["S2"] },
      "4": {
        PLUS: ["R <E -> E PLUS E>", "S3"],
        "<EOF>": ["R <E -> E PLUS E>"],
      },
    });
  });
});

describe("Jison tests", () => {
  const basic = new EBNFParser(`
    E -> E PLUS T | T ;
    T -> ZERO ;
    `).grammar.augmentStartSymbol("S1");

  test("Basic LR1", () => {
    verifyLRParseTable("Jison Basic", basic, makeLRParseTable, {
      "0": { E: ["1"], T: ["2"], ZERO: ["S3"] },
      "1": { PLUS: ["S4"], "<EOF>": ["Acc"] },
      "2": { PLUS: ["R <E -> T>"], "<EOF>": ["R <E -> T>"] },
      "3": { PLUS: ["R <T -> ZERO>"], "<EOF>": ["R <T -> ZERO>"] },
      "4": { T: ["5"], ZERO: ["S3"] },
      "5": { PLUS: ["R <E -> E PLUS T>"], "<EOF>": ["R <E -> E PLUS T>"] },
    });
  });
  test("Basic SLR", () => {
    verifyLRParseTable("Jison Basic", basic, makeSLRParseTable, {
      "0": { E: ["1"], T: ["2"], ZERO: ["S3"] },
      "1": { PLUS: ["S4"], "<EOF>": ["Acc"] },
      "2": { PLUS: ["R <E -> T>"], "<EOF>": ["R <E -> T>"] },
      "3": { PLUS: ["R <T -> ZERO>"], "<EOF>": ["R <T -> ZERO>"] },
      "4": { T: ["5"], ZERO: ["S3"] },
      "5": { PLUS: ["R <E -> E PLUS T>"], "<EOF>": ["R <E -> E PLUS T>"] },
    });
  });

  const dism = new EBNFParser(`
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
    `).grammar.augmentStartSymbol("pgm1");

  test("DISM LR1", () => {
    verifyLRParseTable(
      "Jison DISM",
      dism,
      makeLRParseTable,
      {
        "0": { E: ["1"], T: ["2"], ZERO: ["S3"] },
        "1": { PLUS: ["S4"], "<EOF>": ["Acc"] },
        "2": { PLUS: ["R <E -> T>"], "<EOF>": ["R <E -> T>"] },
        "3": { PLUS: ["R <T -> ZERO>"], "<EOF>": ["R <T -> ZERO>"] },
        "4": { T: ["5"], ZERO: ["S3"] },
        "5": { PLUS: ["R <E -> E PLUS T>"], "<EOF>": ["R <E -> E PLUS T>"] },
      },
      true,
    );
  });
  test("DISM SLR", () => {
    /*
    verifyLRParseTable("Jison DISM", dism, makeSLRParseTable, {
      "0": { E: ["1"], T: ["2"], ZERO: ["S3"] },
      "1": { PLUS: ["S4"], "<EOF>": ["Acc"] },
      "2": { PLUS: ["R <E -> T>"], "<EOF>": ["R <E -> T>"] },
      "3": { PLUS: ["R <T -> ZERO>"], "<EOF>": ["R <T -> ZERO>"] },
      "4": { T: ["5"], ZERO: ["S3"] },
      "5": { PLUS: ["R <E -> E PLUS T>"], "<EOF>": ["R <E -> E PLUS T>"] },
    });
   */
  });
});
