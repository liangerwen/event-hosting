import { Graph } from "@antv/x6";
import { Dnd } from "@antv/x6-plugin-dnd";

export const createDnd = (graph: Graph, container: HTMLElement) =>
  new Dnd({
    target: graph,
    scaled: false,
    dndContainer: container,
  });
