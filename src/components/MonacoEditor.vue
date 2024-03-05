<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watchEffect } from "vue";
import * as monaco from "monaco-editor";

const container = ref<HTMLElement>(),
  instance = shallowRef<monaco.editor.IStandaloneCodeEditor>();

const props = withDefaults(defineProps<{ modelValue?: string }>(), {
  modelValue: "",
});
const emits = defineEmits<{ "update:modelValue": [value?: string] }>();

watchEffect(() => {
  if (props.modelValue !== instance.value?.getValue()) {
    instance.value?.setValue(props.modelValue);
  }
});

onMounted(() => {
  instance.value = monaco.editor.create(container.value!, {
    value: "",
    language: "javascript",
    contextmenu: false,
    minimap: {
      enabled: false,
    },
    autoDetectHighContrast: false,
    wordWrap: "wordWrapColumn",
  });
  instance.value.onDidChangeModelContent(() => {
    emits("update:modelValue", instance.value?.getValue());
  });
});

onBeforeUnmount(() => {
  instance.value?.dispose();
});
</script>

<template>
  <div
    ref="container"
    className="size-full min-h-[500px] border-[rgb(var(--gray-3))] border-1"
  ></div>
</template>
