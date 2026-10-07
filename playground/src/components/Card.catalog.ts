import {defineCatalog} from 'vue-component-catalog/define';

export default defineCatalog({
	props: {title: 'Pro plan', items: ['Unlimited projects', '10 GB storage', 'Priority support'], options: {dense: false}},
	slots: {header: 'Pro plan - $12/month', default: 'Everything in Free, plus more room to grow.', footer: 'Cancel anytime'},
	variants: [{name: 'Free', props: {title: 'Free', items: ['3 projects', '1 GB storage']}}]
});
