import { Core } from '../../core'
import { getRandomInt } from '../../utils/random'
import * as observer from '../../modules/observer'
import { SettingsBuilder, SettingsGroup } from './SettingsBuilder'
import { PageBuilder } from './PageBuilder'

// This entire file is abomination to humanity.
// I feel like a rewrite is needed WHILE i am coding it.

let translationMap = new Map<string, string>()
let groups: SettingsGroup[] = []
let groupsStartIdx: number = 0
let initialized = false
let settings: any = undefined

let originalTranslateGet: (key: string) => string
function hookedTranslateGet(key: string) {
	if (key.startsWith('upl_')) {
		const value = translationMap.get(key)
		if (value != undefined) {
			return value
		}

		console.error(`UPL-Settings: Cannot find translation for key '${key}'!`)
	}

	// @ts-ignore
	return originalTranslateGet.apply(this, arguments)
}

function hookedSettings(this: any) {
	this.Router.map(function () {
		for (const group of groups) {
			for (const category of group.categories) {
				// @ts-ignore
				this.route(category._name)
			}
		}
	})

	const transformName = (name: string) => {
		return name.replace('upl_category_', 'UplCategory')
	}

	let ember = this.Ember

	for (const group of groups) {
		for (const category of group.categories) {

			if (category._builderCallback != undefined) {
				const transformedName = transformName(category._name)

				const builder = category._builderCallback(new PageBuilder())
				const template = builder.build()

				// this.addRoute(transformedName, ember.Route.extend({
				// 	model() {
				// 		console.log('model constructor')
				// 		return {
				// 		}
				// 	}
				// }))
				//
				// this.addController(transformedName, ember.Controller.extend({
				// 	init() {
				//
				// 	},
				// 	actions: {
				// 		onButtonClick() {
				// 			console.log('onButtonClick')
				// 		},
				// 	}
				// }))

				this.addTemplate(category._name, ember.HTMLBars.template({
					id: `upl_template_${getRandomInt(0, 1_000_000)}`,
					block: JSON.stringify(template),
					meta: {}
				}))
			} else if (category._htmlCallback != undefined) {
				const block = {
					statements: [
						[ "open-element", "lol-uikit-scrollable", [ ] ],
						[ "static-attr", "class", category._name ],
						[ "flush-element" ],
						[ "close-element" ]
					],
					locals: [ ],
					named: [ ],
					yields: [ ],
					blocks: [ ],
					hasPartials: false,
				}
				
				this.addTemplate(category._name, ember.HTMLBars.template({
					id: `upl_template_${getRandomInt(0, 1_000_000)}`,
					block: JSON.stringify(block),
					meta: {}
				}))

				observer.subscribeToElementCreation('.' + category._name, category._htmlCallback)
			}
		}
	}
}

function initialize() {
	if (Core == undefined) {
		throw new Error('UPL is not initialized!')
	}

	Core.Context.rcp.postInit('rcp-fe-lol-l10n', (api) => {
		let tra = api.tra()

		originalTranslateGet = tra.__proto__.get
		tra.__proto__.get = hookedTranslateGet
	})

    Core.Context.rcp.postInit('rcp-fe-lol-settings', (api) => {
		settings = api

		if (groups.length > 0) {
			registerGroups(groups, groupsStartIdx)
		}
    })

	Core.Context.rcp.postInit('rcp-fe-ember-libs', async (api) => {
        let factory = await api.getEmberApplicationFactory()

        let originalBuilder = factory.factoryDefinitionBuilder
        factory.factoryDefinitionBuilder = function () {
            let builder = originalBuilder.apply(this, arguments)

            let originalBuild = builder.build
            builder.build = async function () {
                let name = this.getName()

                if (name == 'rcp-fe-lol-settings') {
					// @ts-ignore
					hookedSettings.apply(this, arguments)
                }

                return originalBuild.apply(this, arguments)
            }

            return builder
        }
    })
}

function setTranslations(groups: SettingsGroup[]) {
	for (const group of groups) {
		translationMap.set(group._name, group.title)

		if (group.capitalTitle != group.title) {
			translationMap.set(group._capitalName, group.capitalTitle)
		}

		for (const category of group.categories) {
			translationMap.set(category._name, category.title)
		}
	}
}

function registerGroups(groups: SettingsGroup[], startIdx: number, refresh: boolean = true) {
	let newGroups: any[] = []

	for (const group of groups) {
		let newGroup = {
			name: group._name,
			titleKey: group._name,
			capitalTitleKey: group._capitalName,
			categories: <any[]>[]
		}

		for (const category of group.categories) {
			newGroup.categories.push({
				name: category._name,
				titleKey: category._name,
				routeName: category._name,
				group: newGroup,
				loginStatus: true, // TODO ?
				requireLogin: false, // TODO
				forceDisabled: false,
				computeds: {
					disabled: false,
				},
				isEnabled: () => true, // TODO
			})
		}

		newGroups.push(newGroup)
	}

	settings._modalManager._registeredCategoryGroups.splice(startIdx, 0, ...newGroups)

	if (refresh) {
		settings._modalManager._refreshCategoryGroups()
	}
}

/**
 * Adds settings to the league's settings window.
 * NOTE: Must be called on startup after calling {@link InitUPL}, but before various rcps are loaded!
 * @throws Will throw an error if UPL is not initialized yet!
 */
export function addSettings(build: (builder: SettingsBuilder) => SettingsBuilder) {
	if (!initialized) {
		initialize()
		initialized = true
	}

	let builder = build(new SettingsBuilder())

	setTranslations(builder._groups)
	groups.push(...builder._groups)
	groupsStartIdx = builder._startIdx

	if (settings != undefined) {
		registerGroups(builder._groups, builder._startIdx)
	}
}
