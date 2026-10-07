<script setup lang="ts">
defineProps<{title: string; items?: string[]; options?: {dense: boolean}}>();
</script>

<template>
	<div class="rounded border p-3">
		<h3>
			<slot name="header">{{ title }}</slot>
		</h3>
		<slot />
		<ul>
			<li v-for="i in items" :key="i">{{ i }}</li>
		</ul>
		<footer><slot name="footer" /></footer>
	</div>
</template>
