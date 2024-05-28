import { getRandomInt } from '../../utils/random'
import { PageBuilder } from './PageBuilder'

export type SettingsCategoryHtmlCallback = (element: Element) => void
export type SettingsCategoryBuilderCallback = (builder: PageBuilder) => PageBuilder

export class SettingsCategory {
	title: string

	/** @internal */ _name: string
	/** @internal */ _parent!: SettingsGroup

	/** @internal */ _htmlCallback: SettingsCategoryHtmlCallback | undefined
	/** @internal */ _builderCallback: SettingsCategoryBuilderCallback | undefined

	/** @internal */
	constructor(title: string, parent: SettingsGroup) {
		this.title = title
		this._htmlCallback = undefined
		this._builderCallback = undefined
		this._name = `upl_category_${getRandomInt(1, 1_000_000)}`
		this._parent = parent
	}

	withCallback(callback: SettingsCategoryHtmlCallback) : SettingsCategory {
		this._htmlCallback = callback
		return this
	}
	
	withBuilder(builder: SettingsCategoryBuilderCallback) {
		this._builderCallback = builder
		return this
	}
}

export class SettingsGroup {
	title: string
	capitalTitle: string
	categories: SettingsCategory[]

	/** @internal */ _name: string
	/** @internal */ _capitalName: string
	/** @internal */ _parent!: SettingsBuilder

	/** @internal */
	constructor(title: string, parent: SettingsBuilder) {
		this.title = title
		this.capitalTitle = title
		this._name = `upl_group_${getRandomInt(1, 1_000_000)}`
		this._capitalName = this._name
		this._parent = parent
		this.categories = []
	}

	withCapitalTitle(title: string) {
		this.capitalTitle = title
		this._capitalName = `upl_group_capital_${getRandomInt(1, 1_000_000)}`
	}

	createCategory(title: string, create: (category: SettingsCategory) => SettingsCategory) : SettingsGroup {
		const category = create(new SettingsCategory(title, this))
		this.categories.push(category)
		return this
	}
}

export class SettingsBuilder {
	/** @internal */ _groups: SettingsGroup[]
	/** @internal */ _startIdx: number

	/** @internal */
	constructor() {
		this._groups = []
		this._startIdx = 0
	}

	createGroup(title: string, create: (group: SettingsGroup) => SettingsGroup) : SettingsBuilder {
		const group = create(new SettingsGroup(title, this))
		this._groups.push(group)
		return this
	}

	setStartIdx(idx: number) : SettingsBuilder {
		this._startIdx = idx
		return this
	}
}

