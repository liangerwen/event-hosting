import EventHosting from ".";
import type { Node } from "@antv/x6";
export type * from "@antv/x6";

type Empty<T> = T | null | undefined;

export enum EventNodeType {
  NORMAL = "NORMAL",
  HEAD = "HEAD",
  IF = "IF",
  FOR = "FOR",
}
export type DefaultEventNodeType =
  | EventNodeType.HEAD
  | EventNodeType.NORMAL
  | EventNodeType.IF
  | EventNodeType.FOR;

export type NextNodeType<T> = T extends
  | EventNodeType.NORMAL
  | EventNodeType.HEAD
  ? { nextNodeId: string }
  : T extends EventNodeType.IF
  ? { ifTrueNextNodeId: string; ifFalseNextNodeId: string }
  : T extends EventNodeType.FOR
  ? { bodyNodeId: string; nextNodeId: string }
  : never;

export type EventNode<T extends EventNodeType = DefaultEventNodeType> = {
  type: EventNodeType;
  name: string;
  exec: ExecFunction<T>;
  attrs?: RegisterOption["attrs"];
};

export type PropType = {
  type: "static" | "dynamic" | "function";
  value: any;
};

export type ExecFunction<T extends EventNodeType = DefaultEventNodeType> =
  (options: {
    next: (nextNode?: string) => void;
    props: Record<string, PropType>;
    nextNode: Empty<NextNodeType<T>>;
    ctx: Record<string, any>;
  }) => any | Promise<any>;

export type EventNodeSchema<T extends EventNodeType = DefaultEventNodeType> = {
  id: string;
  type: T;
  name: string;
  props: Record<string, PropType>;
  nextNode: NextNodeType<T>;
} & Record<string, any>;

export type BeforeGuardFunction = (options: {
  to?: EventNodeSchema;
  from: EventNodeSchema;
  next: () => void;
}) => void;

export type AfterGuardFunction = (options: {
  to?: EventNodeSchema;
  from: EventNodeSchema;
}) => void;

export type RegisterOption = {
  label: string;
  exec: ExecFunction<EventNodeType.NORMAL>;
  attrs?: { name: string; default?: any }[];
};

export enum AtomNodeNames {
  HEAD = EventNodeType.HEAD,
  IF = EventNodeType.IF,
  FOR = EventNodeType.FOR,
}

export type DirectionType = "top" | "left" | "right" | "bottom";

export type Plugin = (host: EventHosting) => {
  name: string;
  getInstance?: () => any;
  toJson: (node: Node) => Record<string, any>;
  fromJson: (scchema: EventNodeSchema, node: Node) => void;
};
