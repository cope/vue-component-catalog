import type {App} from 'vue';
import {createPinia} from 'pinia';
import './style.css';

export default (app: App) => {
	app.use(createPinia());
};
