import {defineCatalog} from 'vue-component-catalog/define';

export default defineCatalog({
	props: {variant: 'primary'},
	slot: 'Save',
	variants: [{name: 'Danger', props: {variant: 'danger'}}]
});
