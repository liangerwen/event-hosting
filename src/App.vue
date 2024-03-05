<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  ref,
  watch,
  reactive,
} from "vue";
import cls from "classnames";
import {
  IconPlayArrow,
  IconRecord,
  IconSkipNext,
} from "@arco-design/web-vue/es/icon";
import EventHosting, { AtomNodeNames, Graph, Node } from "./core";
import { InputNumber, Switch, Textarea } from "@arco-design/web-vue";
import { parseValueFromCtx } from "./core/utils";
import AtomComponentWrapper from "./components/AtomComponentWrapper.vue";
import debuggerPlugin from "./core/plugins/debugger";
import data from "./data";

const container = ref<HTMLDivElement>();
const dndContainer = ref<{ $el: HTMLDivElement }>();

const cardClassName =
  "rounded-[8px] transition shadow-md border border-gray-700 border-solid overflow-hidden";

const list = shallowRef([
  {
    name: AtomNodeNames.IF,
    label: "判断",
    attrPanel: [{ name: "value", label: "值", component: Switch }],
  },
  // { name: AtomNodeNames.FOR, label: "循环" },
  {
    name: "console",
    label: "打印",
    attrPanel: [{ name: "value", label: "值", component: Textarea }],
  },
  {
    name: "sleep",
    label: "等待",
    attrPanel: [{ name: "value", label: "值", component: InputNumber }],
  },
]);

const activeNode = shallowRef<Node>();
const activeAttrPanel = computed(
  () => list.value.find((i) => i.name === activeNode.value?.shape)?.attrPanel
);
const form = reactive<Record<string, any>>({});

watch(form, () => {
  if (activeNode.value) {
    activeNode.value.setData({ props: form[activeNode.value.id] });
  }
});

let host: EventHosting, graph: Graph;

onMounted(() => {
  host = new EventHosting({
    graphContainer: container.value!,
    dndContainer: dndContainer.value!.$el,
  });
  host.use(debuggerPlugin);
  EventHosting.registerGlobal("console", {
    label: "打印",
    exec: async ({ next, props, ctx }) => {
      const { value } = props;
      const val = await parseValueFromCtx(value, ctx);
      console.log(val);
      next();
    },
    attrs: [
      {
        name: "value",
        default: "打印",
      },
    ],
  });
  EventHosting.registerGlobal("sleep", {
    label: "等待",
    exec: async ({ next, props, ctx }) => {
      const { value } = props;
      const val = await parseValueFromCtx(value, ctx);
      setTimeout(async () => {
        next();
      }, val as number);
    },
    attrs: [
      {
        name: "value",
        default: 3000,
      },
    ],
  });
  const cache = localStorage.getItem("cache") || data;
  host.fromJson(JSON.parse(cache));
  host.getPluginInstance("debugger")?.init();
  graph = host.getGraph();
  graph.on("node:click", ({ node }) => {
    activeNode.value = node;
    form[node.id] = node.getData()?.props || {};
  });
  graph.on("blank:click", () => {
    activeNode.value = undefined;
  });
});

onBeforeUnmount(() => {
  host?.destroy();
});

const startDrag = (e: MouseEvent, type: string) => {
  host?.startDrag(type, e);
};

const actions = shallowRef([
  {
    label: "执行",
    icon: IconPlayArrow,
    status: "success" as const,
    onClick: () => {
      localStorage.setItem("cache", JSON.stringify(host.toJson()));
      host.play().then(() => {});
    },
  },
  {
    label: "添加/删除断点",
    icon: IconRecord,
    status: "danger" as const,
    onClick: () => {
      const cells = graph.getSelectedCells();
      cells.forEach((c) => {
        if (c.isNode()) {
          host.getPluginInstance("debugger")?.toggleDebugger(c);
        }
      });
    },
  },
  {
    label: "继续",
    icon: IconSkipNext,
    status: "warning" as const,
    onClick: () => {
      host.getPluginInstance("debugger")?.run();
    },
  },
]);
</script>

<template>
  <div class="flex size-screen overflow-hidden p-[12px]">
    <div
      :class="
        cls(
          'w-[280px] h-full overflow-hidden p-[12px] flex-shrink-0 mr-[12px]',
          cardClassName
        )
      "
    >
      <a-row ref="dndContainer" :gutter="[24, 12]"
        ><a-col :span="12" v-for="item in list">
          <a-button
            type="dashed"
            @mousedown.self="startDrag($event, item.name)"
            long
            :key="item.name"
          >
            {{ item.label }}
          </a-button>
        </a-col>
      </a-row>
    </div>
    <div class="flex-1 flex flex-col overflow-hidden">
      <nav
        :class="
          cls(
            'h-[50px] w-full mb-[12px] flex justify-center items-center',
            cardClassName
          )
        "
      >
        <a-tooltip
          v-for="item in actions"
          :key="item.label"
          :content="item.label"
        >
          <a-button type="text" @click="item.onClick" :status="item.status">
            <template #icon> <component :is="item.icon"></component> </template
          ></a-button>
        </a-tooltip>
      </nav>
      <main :class="cls('flex-1 p-[20px]', cardClassName)">
        <div ref="container" class="size-full"></div>
      </main>
    </div>
    <div
      v-if="activeAttrPanel"
      :class="
        cls('w-[280px] h-full p-[12px] flex-shrink-0 ml-[12px]', cardClassName)
      "
    >
      <a-form :model="form">
        <a-form-item
          v-for="item in activeAttrPanel"
          :key="item.name"
          :field="item.name"
          :label="item.label"
        >
          <AtomComponentWrapper
            v-slot="slotProps"
            v-model="form[activeNode!.id][item.name]"
          >
            <component
              :is="item.component"
              :model-value="slotProps.modelValue"
              @change="slotProps.change"
            />
          </AtomComponentWrapper>
        </a-form-item>
      </a-form>
    </div>
  </div>
</template>
