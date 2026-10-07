<script setup lang="ts">
const model = defineModel<number>({default: 0});
</script>

<template>
	<button @click="model++">Count: {{ model }}</button>
</template>
