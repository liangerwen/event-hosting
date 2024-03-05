import EventHosting, { Node, EventNodeSchema, AtomNodeNames } from "..";
import { Graph } from "@antv/x6";

let isRegister = false;

export default function debuggerPlugin(host: EventHosting) {
  const task: (() => EventNodeSchema)[] = [];
  const graph = host.getGraph();
  if (!isRegister) {
    Graph.registerNodeTool("debugger", {
      inherit: "button", // 基类名称，使用已经注册的工具名称。
      markup: [
        {
          tagName: "circle",
          selector: "button",
          attrs: {
            r: 6,
            fill: "rgb(var(--danger-6))",
          },
        },
      ],
    });
    Graph.registerNodeTool("success", {
      inherit: "button", // 基类名称，使用已经注册的工具名称。
      markup: [
        {
          tagName: "circle",
          selector: "button",
          attrs: {
            r: 6,
            fill: "rgb(var(--success-6))",
          },
        },
      ],
    });
    isRegister = true;
  }
  host.beforeEach(async ({ from, next, to }) => {
    if (from.debugger) {
      console.log("当前断点信息", { from, to });
      await new Promise<void>((r) =>
        task.push(() => {
          r();
          return from;
        })
      );
    }
    next();
  });

  host.afterEach(({ to }) => {
    if (!to) {
      const nodes = graph.getNodes();
      nodes.forEach((node) => {
        const isDebugger = !!node.getData()?.debugger;
        if (isDebugger) {
          if (node.hasTool("success")) {
            node.removeTool("success");
          }
          node.addTools("debugger");
        }
      });
    }
  });

  const toggleDebugger = (node: Node) => {
    if (node.shape === AtomNodeNames.HEAD) return;
    const isDebugger = !!node.getData()?.debugger;
    node.setData({ debugger: !isDebugger });
    if (!isDebugger) {
      node.addTools("debugger");
    } else if (node.hasTool("debugger")) {
      node.removeTool("debugger");
    }
  };

  const initDebugger = (node: Node) => {
    if (node.shape === AtomNodeNames.HEAD) return;
    const isDebugger = !!node.getData()?.debugger;
    node.setData({ debugger: isDebugger });
    if (isDebugger) {
      node.addTools("debugger");
    } else if (node.hasTool("debugger")) {
      node.removeTool("debugger");
    }
  };

  return {
    name: "debugger",
    getInstance() {
      return {
        init: () => {
          const nodes = graph.getNodes();
          nodes.forEach((node) => {
            initDebugger(node);
          });
        },
        run: () => {
          const schema = task.shift()?.();
          if (schema) {
            const node = graph.getCellById(schema.id);
            if (node && node.isNode()) {
              if (node.hasTool("debugger")) {
                node.removeTool("debugger");
              }
              node.addTools("success");
            }
          }
        },
        toggleDebugger,
      };
    },
    toJson(node: Node) {
      return {
        debugger: !!node.getData()?.debugger,
      };
    },
    fromJson(schema: EventNodeSchema, node: Node) {
      node.setData({ debugger: !!schema.debugger });
    },
  };
}
