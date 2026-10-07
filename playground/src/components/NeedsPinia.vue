<script setup lang="ts">
import {defineStore} from 'pinia';

const useStore = defineStore('n', {state: () => ({n: 1})});
const store = useStore();
</script>

<template>
	<span>store n = {{ store.n }}</span>
</template>
