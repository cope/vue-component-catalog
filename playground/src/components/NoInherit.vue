<script setup lang="ts">
defineOptions({inheritAttrs: false});
</script>

<template>
	<div><span v-bind="$attrs">inner</span></div>
</template>
