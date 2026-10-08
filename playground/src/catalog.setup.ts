import {defineComponent, h, provide} from 'vue';
import {createPinia} from 'pinia';
import type {CatalogSetup} from 'vue-component-catalog/define';
import './style.css';

const Provide = defineComponent((_, {slots}) => {
	provide('tone', 'calm');
	return () => slots.default?.();
});

const setup: CatalogSetup = (app) => {
	app.use(createPinia());
	return {wrapper: Provide};
};
export default setup;
