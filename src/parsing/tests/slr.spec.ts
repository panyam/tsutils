import { Grammar } from "../grammar";
import { EBNFParser } from "../ebnf";
import { LRItemGraph, LRAction, ParseTable } from "../lrbase";
import { makeSLRParseTable } from "../ptables";
import { verifyLRParseTable, Goto, Shift, Reduce, expectPTableActions } from "./utils";

const g1 = new EBNFParser(`
  E -> E PLUS T | T ;
  T -> T STAR F | F ;
  F -> OPEN E CLOSE | id ;
`).grammar.augmentStartSymbol("E1");

describe("LR ParseTable", () => {
  test("Test Basic", () => {
    verifyLRParseTable("G1", g1, makeSLRParseTable, {
      "0": { E: ["1"], T: ["2"], F: ["3"], OPEN: ["S4"], id: ["S5"] },
      "1": { PLUS: ["S6"], "<EOF>": ["Acc"] },
      "2": {
        PLUS: ["R <E -> T>"],
        STAR: ["S7"],
        CLOSE: ["R <E -> T>"],
        "<EOF>": ["R <E -> T>"],
      },
      "3": {
        PLUS: ["R <T -> F>"],
        STAR: ["R <T -> F>"],
        CLOSE: ["R <T -> F>"],
        "<EOF>": ["R <T -> F>"],
      },
      "4": { E: ["8"], T: ["2"], F: ["3"], OPEN: ["S4"], id: ["S5"] },
      "5": {
        PLUS: ["R <F -> id>"],
        STAR: ["R <F -> id>"],
        CLOSE: ["R <F -> id>"],
        "<EOF>": ["R <F -> id>"],
      },
      "6": { T: ["9"], F: ["3"], OPEN: ["S4"], id: ["S5"] },
      "7": { F: ["10"], OPEN: ["S4"], id: ["S5"] },
      "8": { PLUS: ["S6"], CLOSE: ["S11"] },
      "9": {
        PLUS: ["R <E -> E PLUS T>"],
        STAR: ["S7"],
        CLOSE: ["R <E -> E PLUS T>"],
        "<EOF>": ["R <E -> E PLUS T>"],
      },
      "10": {
        PLUS: ["R <T -> T STAR F>"],
        STAR: ["R <T -> T STAR F>"],
        CLOSE: ["R <T -> T STAR F>"],
        "<EOF>": ["R <T -> T STAR F>"],
      },
      "11": {
        PLUS: ["R <F -> OPEN E CLOSE>"],
        STAR: ["R <F -> OPEN E CLOSE>"],
        CLOSE: ["R <F -> OPEN E CLOSE>"],
        "<EOF>": ["R <F -> OPEN E CLOSE>"],
      },
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
