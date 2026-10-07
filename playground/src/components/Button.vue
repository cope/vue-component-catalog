<script setup lang="ts">
withDefaults(defineProps<{variant?: 'primary' | 'ghost' | 'danger'; size?: number; disabled?: boolean}>(), {
	variant: 'primary',
	size: 14
});
defineEmits<{click: [e: MouseEvent]}>();
</script>

<template>
	<button
		:disabled="disabled"
		:style="{fontSize: size + 'px'}"
		:class="variant === 'primary' ? 'bg-primary text-white' : variant === 'danger' ? 'bg-red-600 text-white' : 'border'"
		class="rounded px-3 py-1"
		@click="$emit('click', $event)"
	>
		<slot />
	</button>
</template>
