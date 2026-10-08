<script setup lang="ts">
import {inject} from 'vue';

// throws like reka-ui's Tooltip when no provider wraps it
const tone = inject<string>('tone');
if (!tone) throw new Error('Injection `tone` not found. Component must be used within the catalog wrapper');
</script>

<template>
	<span>tone = {{ tone }}</span>
</template>
