import { Graph, Shape, Node, Cell } from "@antv/x6";
import { Selection } from "@antv/x6-plugin-selection";
import { Snapline } from "@antv/x6-plugin-snapline";
import { Keyboard } from "@antv/x6-plugin-keyboard";
import { Clipboard } from "@antv/x6-plugin-clipboard";
import { History } from "@antv/x6-plugin-history";
import { merge } from "lodash-es";
import { AtomNodeNames, DirectionType, EventNodeType } from "./types";

type PortType = Node.Properties["ports"];

const createPorts = (directions: DirectionType[]) => {
  const ports: PortType = { groups: {}, items: [] },
    attrs = {
      circle: {
        r: 4,
        magnet: true,
        stroke: "#5F95FF",
        strokeWidth: 1,
        fill: "#fff",
      },
      style: {
        visibility: "hidden",
      },
    };
  directions.forEach((d) => {
    ports.groups![d] = {
      position: d,
      attrs,
    };
    ports.items?.push({ group: d });
  });
  return ports;
};

const regedit: Record<string, Node.Definition> = {};

export const registerNode = (
  name: string,
  type: EventNodeType,
  label: string,
  attr?: Cell.Properties["attrs"]
) => {
  if (regedit[name]) return;
  const ports: DirectionType[] =
    type === EventNodeType.IF
      ? ["top", "left", "right"]
      : type === EventNodeType.FOR
      ? ["top", "left", "bottom"]
      : type === EventNodeType.HEAD
      ? ["bottom"]
      : ["top", "bottom"];
  const attrs = merge(
    {
      body: {
        strokeWidth: 1,
        stroke: "rgb(var(--primary-3))",
        fill: "rgb(var(--primary-1))",
      },
      text: {
        fontSize: 12,
        fill: "rgb(var(--primary-6))",
      },
    },
    attr
  );
  const Node = Graph.registerNode(
    name,
    {
      inherit: "rect",
      width: 100,
      height: 40,
      attrs,
      label,
      ports: createPorts(ports),
    },
    true
  );
  regedit[name] = Node;
};

const setPortsVisible = (ports: NodeListOf<SVGElement>, visible: boolean) => {
  for (let i = 0, len = ports.length; i < len; i += 1) {
    ports[i].style.visibility = visible ? "visible" : "hidden";
  }
};

export const createGraph = (container: HTMLElement) => {
  const graph = new Graph({
    container,
    grid: true,
    mousewheel: {
      enabled: true,
      zoomAtMousePosition: true,
      modifiers: "ctrl",
      minScale: 0.5,
      maxScale: 3,
    },
    connecting: {
      router: {
        name: "manhattan",
        args: {
          padding: 1,
        },
      },
      connector: {
        name: "rounded",
        args: {
          radius: 8,
        },
      },
      anchor: "center",
      connectionPoint: "anchor",
      allowBlank: false,
      snap: {
        radius: 20,
      },
      createEdge(source) {
        const isIf = source.sourceCell.shape === AtomNodeNames.IF;
        const isFor = source.sourceCell.shape === AtomNodeNames.FOR;
        const direction = source.sourceMagnet.getAttribute("port-group");
        let label = "";
        if (isIf) {
          label =
            direction === "left" ? "假" : direction === "right" ? "真" : "";
        } else if (isFor) {
          label =
            direction === "left"
              ? "循环体"
              : direction === "bottom"
              ? "结束"
              : "";
        }
        return new Shape.Edge({
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
          labels: label ? [label] : undefined,
        });
      },
      validateConnection({
        sourceCell,
        targetCell,
        sourceMagnet,
        targetMagnet,
        sourcePort,
        targetPort,
      }) {
        if (
          sourceCell &&
          targetCell &&
          sourceMagnet &&
          targetMagnet &&
          sourcePort &&
          targetPort
        ) {
          const sd = sourceMagnet.getAttribute("port-group"),
            td = targetMagnet.getAttribute("port-group"),
            st = sourceCell.shape,
            tt = targetCell.shape,
            sid = sourceCell.id,
            tid = targetCell.id;
          let connectFlag = true;
          this.getEdges()
            .filter((e) => e.getTargetCellId())
            .forEach((e) => {
              const source = e.getSourceCell(),
                portId = e.getSourcePortId();
              if (source?.isNode() && portId) {
                const portGroup = source.getPort(portId)?.group;
                if (portGroup) {
                  // 保证一个开始点只能开始一条线
                  connectFlag =
                    connectFlag && !(source.id === sid && portGroup === sd);
                }
              }
            });
          if (sid !== tid && tt !== AtomNodeNames.HEAD) {
            // 保证一个起点为node的开始点
            if (st === AtomNodeNames.IF) {
              connectFlag = connectFlag && (sd === "left" || sd === "right");
            } else if (st === AtomNodeNames.FOR) {
              connectFlag = connectFlag && (sd === "left" || sd === "bottom");
            } else {
              connectFlag = connectFlag && sd === "bottom";
            }
            // 保证终点为其他node的开始点
            connectFlag = connectFlag && td === "top";
            return connectFlag;
          }
        }
        return false;
      },
    },
    highlighting: {
      magnetAdsorbed: {
        name: "stroke",
        args: {
          attrs: {
            fill: "rgb(var(--primary-6))",
            stroke: "rgb(var(--primary-6))",
          },
        },
      },
    },
  });
  graph
    .use(
      new Selection({
        showNodeSelectionBox: true,
        rubberband: true,
      })
    )
    .use(new Snapline())
    .use(new Keyboard())
    .use(new Clipboard())
    .use(new History());

  // #region 快捷键与事件
  graph.bindKey(["meta+c", "ctrl+c"], () => {
    const cells = graph.getSelectedCells();
    if (cells.length) {
      graph.copy(cells.filter((c) => c.shape !== AtomNodeNames.HEAD));
    }
    return false;
  });
  graph.bindKey(["meta+x", "ctrl+x"], () => {
    const cells = graph.getSelectedCells();
    if (cells.length) {
      graph.cut(cells.filter((c) => c.shape !== AtomNodeNames.HEAD));
    }
    return false;
  });
  graph.bindKey(["meta+v", "ctrl+v"], () => {
    if (!graph.isClipboardEmpty()) {
      const cells = graph.paste({ offset: 32 });
      graph.cleanSelection();
      graph.select(cells);
    }
    return false;
  });

  // undo redo
  graph.bindKey(["meta+z", "ctrl+z"], () => {
    if (graph.canUndo()) {
      graph.undo();
    }
    return false;
  });
  graph.bindKey(["meta+shift+z", "ctrl+shift+z"], () => {
    if (graph.canRedo()) {
      graph.redo();
    }
    return false;
  });

  // select all
  graph.bindKey(["meta+a", "ctrl+a"], () => {
    const nodes = graph.getNodes();
    if (nodes) {
      graph.select(nodes);
    }
  });

  // delete
  graph.bindKey("backspace", () => {
    const cells = graph.getSelectedCells();
    if (cells.length) {
      graph.removeCells(cells.filter((c) => c.shape !== AtomNodeNames.HEAD));
    }
  });

  // zoom
  graph.bindKey(["ctrl+1", "meta+1"], () => {
    const zoom = graph.zoom();
    if (zoom < 1.5) {
      graph.zoom(0.1);
    }
  });
  graph.bindKey(["ctrl+2", "meta+2"], () => {
    const zoom = graph.zoom();
    if (zoom > 0.5) {
      graph.zoom(-0.1);
    }
  });

  graph.on("node:mouseenter", () => {
    const ports = graph.container.querySelectorAll<SVGElement>(".x6-port-body");
    setPortsVisible(ports, true);
  });
  graph.on("node:mouseleave", () => {
    const ports = graph.container.querySelectorAll<SVGElement>(".x6-port-body");
    setPortsVisible(ports, false);
  });

  return graph;
};

export const createNode = (name: string, props?: Node.Properties) => {
  if (regedit[name]) {
    return new regedit[name](props);
  }
  return null;
};
