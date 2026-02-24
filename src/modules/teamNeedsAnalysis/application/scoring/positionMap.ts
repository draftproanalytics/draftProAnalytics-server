export type PositionGroup =
  | "QB" | "RB" | "WR" | "TE"
  | "OT" | "IOL"
  | "IDL" | "EDGE" | "LB"
  | "CB" | "S"
  | "K" | "P";

export const POSITION_GROUPS: readonly PositionGroup[] = [
  "QB","RB","WR","TE","OT","IOL","IDL","EDGE","LB","CB","S","K","P",
];

export const GROUP_TARGET_DEPTH: Record<PositionGroup, number> = {
  QB: 2,
  RB: 4,
  WR: 6,
  TE: 4,
  OT: 4,
  IOL: 6,
  IDL: 5,
  EDGE: 5,
  LB: 6,
  CB: 6,
  S: 4,
  K: 1,
  P: 1,
};

// Draft-value bump
export const POSITION_VALUE_FACTOR: Record<PositionGroup, number> = {
  QB: 1.10,
  OT: 1.10,
  EDGE: 1.10,
  CB: 1.10,

  WR: 1.00,
  IDL: 1.00,
  S: 1.00,
  IOL: 1.00,
  TE: 0.95,
  LB: 0.95,
  RB: 0.90,
  K: 0.85,
  P: 0.85,
};

const ESPN_POS_TO_GROUP: Readonly<Record<string, PositionGroup>> = {
  QB: "QB",

  RB: "RB",
  FB: "RB",

  WR: "WR",

  TE: "TE",

  LT: "OT",
  RT: "OT",
  T: "OT",

  LG: "IOL",
  RG: "IOL",
  G: "IOL",
  C: "IOL",

  DT: "IDL",
  NT: "IDL",

  DE: "EDGE",
  OLB: "EDGE", // v1 heuristic
  EDGE: "EDGE",

  ILB: "LB",
  MLB: "LB",
  LB: "LB",

  CB: "CB",

  FS: "S",
  SS: "S",
  S: "S",

  K: "K",
  PK: "K",

  P: "P",
};

export function mapEspnPositionToGroup(pos: string): PositionGroup | undefined {
  const key = pos.trim().toUpperCase();
  return ESPN_POS_TO_GROUP[key];
}
