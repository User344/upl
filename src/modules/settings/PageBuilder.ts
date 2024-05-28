type NestedStringArray = string | NestedStringArray[]

class HtmlTemplateObject {
  statements: any[] = []
  locals: NestedStringArray = []
  named: NestedStringArray = []
  yields: NestedStringArray = []
  blocks: NestedStringArray[] = []
}

interface IBasePageElement {
  /** @internal */
  build(template: HtmlTemplateObject): void
}

class HtmlPageElement implements IBasePageElement {
	/** @internal */ private tag: string
	/** @internal */ private attributes: [string, string][]
	/** @internal */ private children: IBasePageElement[]

  /** @internal */
  constructor(tag: string, classes: string[] | undefined = undefined) {
    this.tag = tag
    this.attributes = classes?.map(x => ['class', x]) ?? []
    this.children = []
  }

  /** @internal */
  build(template: HtmlTemplateObject): void {
    template.statements.push(['open-element', this.tag, []])

    for (const attribute of this.attributes) {
      template.statements.push(['static-attr', attribute[0], attribute[1]])
    }

    template.statements.push(['flush-element'])

    for (const child of this.children) {
      child.build(template)
    }

    template.statements.push(['close-element'])
  }

  withAttribute(name: string, value: string): HtmlPageElement {
    this.attributes.push([name, value])
    return this
  }

  withChildren(children: IBasePageElement[]): HtmlPageElement {
    this.children.push(...children)
    return this
  }
}

class CheckboxElement implements IBasePageElement {
	/** @internal */ private title: string
  // /** @internal */ private 

  /** @internal */
  constructor(title: string) {
    this.title = title
  }

  /** @internal */
  build(template: HtmlTemplateObject): void {
    template.statements.push(['open-element', 'lol-uikit-flat-checkbox', []])
    template.statements.push(['static-attr', 'for', []])



    template.statements.push(['close-element'])
  }
}

export class PageBuilder {
	/** @internal */ elements: IBasePageElement[]

  /** @internal */
  constructor() {
    this.elements = []
  }

  /** @internal */
  build(): HtmlTemplateObject {
    let template = new HtmlTemplateObject()

    for (const element of this.elements) {
      element.build(template)
    }

    return template
  }

  createHtmlElement(tag: string, classes: string[] | undefined = undefined): HtmlPageElement {
    return new HtmlPageElement(tag, classes)
  }

  createScrollable(additionalClasses: string[] = []) {
    return new HtmlPageElement('div', ['lol-uikit-scrollable'].concat(additionalClasses))
  }

  createRow(additionalClasses: string[] = []) {
    return new HtmlPageElement('div', ['lol-settings-general-row'].concat(additionalClasses))
  }

  createCheckbox(title: string) {
    return new CheckboxElement(title)
  }

  withElements(elements: IBasePageElement[]): PageBuilder {
    this.elements.push(...elements)
    return this
  }
}
