<script setup lang="ts">
import { computed, ref } from "vue";
import MonacoEditor from "./MonacoEditor.vue";

export interface AtomComponentWrapperProps {
  modelValue: {
    type: "static" | "dynamic" | "function";
    value?: string;
  };
}

const props = withDefaults(defineProps<AtomComponentWrapperProps>(), {
  modelValue: {
    // @ts-ignore
    type: "static",
    value: undefined,
  },
});
const emit = defineEmits(["update:modelValue"]);

const type = computed(() => props.modelValue.type);
const value = computed(() => props.modelValue.value);

const visible = ref(false);

const onTypeChange = (v: "static" | "dynamic" | "function") => {
  emit("update:modelValue", { value: value.value, type: v });
};
const onValueChange = (v?: string) => {
  emit("update:modelValue", { type: type.value, value: v });
};
</script>

<template>
  <div>
    <a-radio-group @change="onTypeChange" :model-value="type" type="button" class="mb-2">
      <a-radio value="static">静态</a-radio>
      <a-radio value="dynamic">动态</a-radio>
      <a-radio value="function">函数</a-radio>
    </a-radio-group>
    <template v-if="type === 'static'">
      <slot :model-value="value" :change="onValueChange" />
    </template>
    <template v-if="type === 'dynamic'">
      <a-input :model-value="value" @input="onValueChange" />
    </template>
    <template v-if="type === 'function'">
      <a-button @click="visible = true">编辑函数</a-button>
    </template>
    <a-modal v-model:visible="visible" title="编辑函数" unmount-on-close width="80%" :height="500">
      <MonacoEditor :model-value="value" @update:modelValue="onValueChange" />
    </a-modal>
  </div>
</template>
