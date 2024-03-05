import { get } from "lodash-es";
import { EventNodeSchema, EventNodeType, AtomNodeNames } from "..";
import { createNode } from "../graph";
import { Edge, Graph, Model, Node, Shape } from "@antv/x6";
import { DirectionType, PropType } from "../types";

type OptionType = {
  type: EventNodeType;
  ports: {
    direction: DirectionType;
    key: string;
    label?: string;
  }[];
};

const options: OptionType[] = [
  {
    type: EventNodeType.HEAD,
    ports: [
      {
        direction: "bottom",
        key: "nextNodeId",
      },
    ],
  },
  {
    type: EventNodeType.IF,
    ports: [
      {
        direction: "left",
        key: "ifFalseNextNodeId",
        label: "假",
      },
      {
        direction: "right",
        key: "ifTrueNextNodeId",
        label: "真",
      },
    ],
  },
  {
    type: EventNodeType.FOR,
    ports: [
      {
        direction: "left",
        key: "bodyNodeId",
        label: "循环体",
      },
      {
        direction: "bottom",
        key: "nextNodeId",
        label: "结束",
      },
    ],
  },
  {
    type: EventNodeType.NORMAL,
    ports: [
      {
        direction: "bottom",
        key: "nextNodeId",
      },
    ],
  },
];

const node2json = (
  node: Node<Node.Properties>,
  nextMap: Map<string, string>,
  cb?: (node: Node) => Record<string, any>
): EventNodeSchema => {
  const id = node.id,
    nodeType = node.shape,
    data = node.getData();
  const common = {
    id,
    name: nodeType,
    debugger: data?.debugger || false,
    props: data?.props || {},
    position: node.getPosition(),
    ...cb?.(node),
  };
  switch (nodeType) {
    case AtomNodeNames.IF: {
      const ifFalseNextNodeId = nextMap.get(`${id}-left`);
      const ifTrueNextNodeId = nextMap.get(`${id}-right`);
      return {
        ...common,
        type: EventNodeType.IF,
        nextNode: (ifTrueNextNodeId || ifFalseNextNodeId) && {
          ifTrueNextNodeId,
          ifFalseNextNodeId,
        },
      } as EventNodeSchema<EventNodeType.IF>;
    }
    case AtomNodeNames.FOR: {
      const bodyNodeId = nextMap.get(`${id}-left`);
      const nextNodeId = nextMap.get(`${id}-bottom`);
      return {
        ...common,
        type: EventNodeType.FOR,
        nextNode: (bodyNodeId || nextNodeId) && {
          bodyNodeId,
          nextNodeId,
        },
      } as EventNodeSchema<EventNodeType.FOR>;
    }
    case AtomNodeNames.HEAD: {
      const nextNodeId = nextMap.get(`${id}-bottom`);
      return {
        ...common,
        type: EventNodeType.HEAD,
        nextNode: nextNodeId && {
          nextNodeId,
        },
      } as EventNodeSchema<EventNodeType.HEAD>;
    }
    default: {
      const nextNodeId = nextMap.get(`${id}-bottom`);
      return {
        ...common,
        type: EventNodeType.NORMAL,
        nextNode: nextNodeId && {
          nextNodeId,
        },
      } as EventNodeSchema<EventNodeType.NORMAL>;
    }
  }
};

export const toJson = (
  graph: Graph,
  cb?: (node: Node) => Record<string, any>
) => {
  const nextToMap = new Map();
  const cache = new Map();
  const edges = graph.getEdges();
  const nodes = graph.getNodes();
  edges.forEach((e) => {
    const portId = e.getSourcePortId(),
      tid = e.getTargetCellId(),
      source = e.getSourceCell();
    if (source?.isNode() && portId) {
      const d = source.getPort(portId)?.group;
      const sid = `${source.id}-${d}`;
      if (sid && tid) {
        nextToMap.set(sid, tid);
      }
    }
  });
  const ret: EventNodeSchema[] = [];
  const head = nodes.find((n) => n.shape === AtomNodeNames.HEAD);
  if (head) {
    const h = node2json(
      head,
      nextToMap,
      cb
    ) as EventNodeSchema<EventNodeType.HEAD>;
    ret.push(h);
    const rootId = h.nextNode?.nextNodeId;
    if (rootId) {
      const queue = [rootId];
      while (queue.length) {
        const nextId = queue.shift();
        const node = nodes.find((n) => n.id === nextId);
        if (node) {
          if (cache.has(nextId)) {
            continue;
          }
          cache.set(nextId, node);
          const nextNode = node2json(node, nextToMap, cb);
          ret.push(nextNode);
          const ids = Object.values(nextNode.nextNode || {}).filter(Boolean);
          if (ids.length) {
            queue.push(...ids);
          }
        }
      }
    }
  }
  return ret;
};

export const fromJson = (
  schema: EventNodeSchema[],
  cb?: (schema: EventNodeSchema, node: Node) => void
) => {
  const nodes: Node<Node.Properties>[] = [];
  const ret: Model.FromJSONData = { cells: [] };
  schema.forEach((s) => {
    const node = createNode(s.name, {
      id: s.id,
      shape: s.name,
      data: {
        debugger: s.debugger,
        props: s.props,
      },
      ...s.position,
    });
    if (node) {
      cb?.(s, node);
      nodes.push(node);
      ret.cells?.push(node.toJSON());
    }
  });
  schema.forEach((s) => {
    const node = nodes.find((n) => n.id === s.id);
    const opt = options.find((o) => o.type === s.type);
    const edges =
      opt?.ports
        .map((port) => {
          const nextId = s.nextNode?.[
            port.key as keyof typeof s.nextNode
          ] as string;
          const nextNode = nodes.find((n) => n.id === nextId);
          const sourcePortId = node?.getPortsByGroup(port.direction)?.[0]?.id,
            targetPortId = nextNode?.getPortsByGroup("top")?.[0]?.id;
          if (!nextId) return;
          const edge = new Shape.Edge({
            attrs: {
              line: {
                stroke: "rgb(var(--success-3))",
                strokeWidth: 2,
                targetMarker: {
                  name: "block",
                  width: 12,
                  height: 8,
                },
              },
            },
            zIndex: 0,
            labels: port.label ? [port.label] : undefined,
            source: { cell: s.id, port: sourcePortId },
            target: { cell: nextId, port: targetPortId },
          });
          return edge.toJSON();
        })
        .filter(Boolean) || [];
    ret.cells?.push(...(edges as Edge.Properties[]));
  });
  return ret;
};

const parseStaticValue = (v: any) => {
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const stringifyStaticValue = (v: any) => {
  return JSON.stringify(v);
};

const AsyncFunction = (async () => {}).constructor;

export const parseValueFromCtx = (prop: PropType, ctx: Record<string, any>) => {
  if (typeof prop !== "object") {
    return prop;
  }
  const { value, type } = prop;
  switch (type) {
    case "static": {
      return parseStaticValue(value);
    }
    case "dynamic": {
      return get(ctx, value);
    }
    case "function": {
      // @ts-ignore
      return new AsyncFunction("ctx", value)(ctx);
    }
    default:
      break;
  }
};
