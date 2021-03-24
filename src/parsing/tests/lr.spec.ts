import { StringMap } from "../../types";
import { assert } from "../../utils/misc";
import { Grammar } from "../grammar";
import { EBNFParser } from "../ebnf";
import { LRAction, ParseTable, LRItemGraph } from "../lrbase";
import { LR1ItemGraph } from "../lr1";
import { makeLRParseTable } from "../ptables";
import { verifyLRParseTable, Goto, Shift, Reduce, expectPTableActions } from "./utils";

const g1 = new EBNFParser(` S -> C C ; C -> c C | d ; `).grammar.augmentStartSymbol("S1");

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

const g2 = new EBNFParser(`
  S -> L EQ R ;
  S -> R ;
  L -> STAR R ;
  L -> id ;
  R -> L ;
`).grammar.augmentStartSymbol("S1");

describe("LRParseTable with Conflicts", () => {
  test("Test1", () => {
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
