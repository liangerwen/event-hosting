import { Graph } from "@antv/x6";
import { createGraph, createNode, registerNode } from "./graph";
import { createDnd } from "./dnd";
import { Dnd } from "@antv/x6-plugin-dnd";
import { fromJson, parseValueFromCtx, toJson } from "./utils";
import {
  AfterGuardFunction,
  AtomNodeNames,
  BeforeGuardFunction,
  EventNode,
  EventNodeSchema,
  EventNodeType,
  NextNodeType,
  RegisterOption,
  Plugin,
} from "./types";
import { merge, throttle } from "lodash-es";

const HEAD: EventNode<EventNodeType.HEAD> = {
    type: EventNodeType.HEAD,
    name: AtomNodeNames.HEAD,
    exec: ({ next }) => next(),
  },
  IF: EventNode<EventNodeType.IF> = {
    type: EventNodeType.IF,
    name: AtomNodeNames.IF,
    exec: async ({ next, nextNode, props, ctx }) => {
      const { ifFalseNextNodeId, ifTrueNextNodeId } = nextNode || {};
      const { value } = props;
      const val = await parseValueFromCtx(value, ctx);
      next(val ? ifTrueNextNodeId : ifFalseNextNodeId);
    },
    attrs: [
      {
        name: "value",
        default: false,
      },
    ],
  },
  FOR: EventNode<EventNodeType.FOR> = {
    type: EventNodeType.FOR,
    name: AtomNodeNames.FOR,
    exec: ({ next }) => next(),
  };

const globalEventNodes: EventNode[] = [HEAD, IF, FOR];

registerNode(AtomNodeNames.HEAD, EventNodeType.HEAD, "开始", {
  body: { rx: 20 },
});
registerNode(AtomNodeNames.IF, EventNodeType.IF, "判断");
registerNode(AtomNodeNames.FOR, EventNodeType.FOR, "循环");

export default class EventHosting {
  #graph: Graph;
  #dnd: Dnd;
  #plugins: ReturnType<Plugin>[] = [];
  #afterEachCallbacks: AfterGuardFunction[] = [];
  #beforeEachCallbacks: BeforeGuardFunction[] = [];
  #eventNodes: EventNode[] = [];
  #resizeObserver: ResizeObserver;
  constructor({
    graphContainer,
    dndContainer,
  }: {
    graphContainer: HTMLElement;
    dndContainer: HTMLElement;
  }) {
    let length = graphContainer.children.length;
    while (length > 1) {
      graphContainer.lastChild?.remove();
      length--;
    }
    let child = graphContainer.firstChild;
    if (!child) {
      child = document.createElement("div");
      graphContainer.appendChild(child);
    }
    this.#graph = createGraph(child as HTMLElement);
    this.#dnd = createDnd(this.#graph, dndContainer);
    this.reset();
    this.#resizeObserver = new ResizeObserver(
      throttle((entries) => {
        if (entries.length) {
          const rect = entries[0].contentRect;
          this.#graph.resize(rect.width, rect.height);
        }
      }, 200)
    );
    this.#resizeObserver.observe(graphContainer);
  }
  static registerGlobal(name: string, options: RegisterOption) {
    registerNode(name, EventNodeType.NORMAL, options.label);
    globalEventNodes.push({
      type: EventNodeType.NORMAL,
      name,
      exec: options.exec,
      attrs: options.attrs,
    });
  }
  reset() {
    this.#graph.clearCells();
    const head = createNode(AtomNodeNames.HEAD);
    if (head) {
      this.#graph.addNode(head);
      this.#graph.positionCell(head, "top");
    }
  }
  register(name: string, options: RegisterOption) {
    registerNode(name, EventNodeType.NORMAL, options.label);
    this.#eventNodes.push({
      type: EventNodeType.NORMAL,
      name,
      exec: options.exec,
      attrs: options.attrs,
    });
  }
  use(p: Plugin) {
    this.#plugins.push(p(this));
  }
  beforeEach(cb: BeforeGuardFunction) {
    this.#beforeEachCallbacks.push(cb);
  }
  afterEach(cb: AfterGuardFunction) {
    this.#afterEachCallbacks.push(cb);
  }
  startDrag(name: string, e: MouseEvent) {
    const node = createNode(name);
    if (node) {
      this.#dnd.start(node, e);
    }
  }
  play(ctx: Record<string, any> = {}) {
    const schema = this.toJson();
    console.log(schema);
    return new Promise<void>(async (resolve, reject) => {
      let head = schema.find((s) => s.type === EventNodeType.HEAD);
      if (head) {
        const { nextNode: { nextNodeId } = {}, type } =
          head as EventNodeSchema<EventNodeType.HEAD>;
        let nextId = nextNodeId;
        const next = async (id?: string) => {
          const nextNode = schema.find((s) => s.id === (id || nextId));
          if (this.#afterEachCallbacks.length) {
            this.#afterEachCallbacks.forEach((c) => {
              c({
                from: head!,
                to: nextNode,
              });
            });
          }
          if (nextNode) {
            if (
              nextNode.type === EventNodeType.HEAD ||
              nextNode.type === EventNodeType.NORMAL
            ) {
              nextId = (
                nextNode.nextNode as NextNodeType<
                  EventNodeType.HEAD | EventNodeType.NORMAL
                >
              )?.nextNodeId;
            } else {
              nextId = undefined;
            }
            head = nextNode;
            await _exec(nextNode.name);
          } else {
            resolve();
          }
        };
        const _exec = async (name: string) => {
          const ev = [...globalEventNodes, ...this.#eventNodes].find(
            (e) => e.name === name
          );
          if (ev) {
            const { exec, attrs = [] } = ev;
            try {
              let flags = Array.from({
                length: this.#beforeEachCallbacks.length,
              }).fill(false);
              await Promise.all(
                this.#beforeEachCallbacks.map((c, idx) => {
                  const beforeEachNext = () => {
                    flags[idx] = true;
                  };
                  return c({
                    next: beforeEachNext,
                    from: head!,
                    to: schema.find((s) => s.id === nextId),
                  });
                })
              );
              if (flags.length === 0 || flags.every(Boolean)) {
                const props = attrs.reduce<Record<string, any>>(
                  (pre, cur) => ((pre[cur.name] = cur.default), pre),
                  {}
                );
                exec({
                  nextNode: head?.nextNode,
                  ctx,
                  props: merge(props, head?.props || {}),
                  next,
                });
              }
            } catch (e) {
              reject(e);
            }
          }
        };
        await _exec(type);
      }
    });
  }
  getGraph() {
    return this.#graph;
  }
  toJson() {
    return toJson(this.#graph);
  }
  fromJson(schema: EventNodeSchema[]) {
    this.#graph.fromJSON(fromJson(schema));
  }
  destroy() {
    this.#dnd.dispose();
    this.#graph.dispose();
    this.#resizeObserver.disconnect();
  }
  getPluginInstance(name: string) {
    return this.#plugins.find((p) => p.name === name)?.getInstance?.();
  }
}

export * from "./types";

export { createNode };
