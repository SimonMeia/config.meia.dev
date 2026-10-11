import { fetchConfig } from '../lib/config-api.ts'
import type { ConfigResponse } from '../lib/config-schema.ts'

function element<T extends Element>(root: ParentNode, selector: string): T {
    const result = root.querySelector<T>(selector)
    if (!result) throw new Error(`Missing configuration view element: ${selector}`)
    return result
}

function clone(root: HTMLElement, selector: string): DocumentFragment {
    return element<HTMLTemplateElement>(root, selector).content.cloneNode(true) as DocumentFragment
}

export function formatUpdatedAt(updatedAt: string): string {
    return new Intl.DateTimeFormat('de-DE', {
        timeZone: 'UTC',
        day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date(updatedAt))
}

function renderConfig(root: HTMLElement, response: ConfigResponse): void {
    const navigation = document.createDocumentFragment()
    const categories = document.createDocumentFragment()

    for (const config of response.configs) {
        const nav = clone(root, '[data-navigation-template]')
        const link = element<HTMLAnchorElement>(nav, 'a')
        link.href = `#${config.slug}`
        link.textContent = config.name
        navigation.append(nav)

        const category = clone(root, '[data-category-template]')
        element<HTMLElement>(category, 'li').id = config.slug
        element<HTMLElement>(category, '[data-category-name]').textContent = config.name
        const components = element<HTMLElement>(category, '[data-components]')

        for (const component of config.components) {
            const card = clone(root, '[data-card-template]')
            const productLink = element<HTMLAnchorElement>(card, '[data-component-link]')
            productLink.href = component.link
            productLink.setAttribute('aria-label', `View product: ${component.model}`)
            element<HTMLElement>(card, '[data-component-name]').textContent = component.name
            element<HTMLElement>(card, '[data-component-model]').textContent = component.model
            const specs = element<HTMLElement>(card, '[data-component-specs]')

            for (const spec of component.specs) {
                const row = clone(root, '[data-spec-template]')
                element<HTMLElement>(row, '[data-spec-name]').textContent = `${spec.name}:`
                element<HTMLElement>(row, '[data-spec-value]').textContent = ` ${spec.value}`
                specs.append(row)
            }
            components.append(card)
        }
        categories.append(category)
    }

    element<HTMLElement>(root, '[data-navigation]').replaceChildren(navigation)
    element<HTMLElement>(root, '[data-categories]').replaceChildren(categories)
    const date = element<HTMLElement>(root, '[data-update-date]')
    date.textContent = `Update date : ${formatUpdatedAt(response.updatedAt)}`
    date.hidden = false
}

function scrollToCategory(root: HTMLElement): void {
    let slug: string
    try {
        slug = decodeURIComponent(window.location.hash.slice(1))
    } catch {
        return
    }
    const category = Array.from(element<HTMLElement>(root, '[data-categories]').children)
        .find((entry) => entry.id === slug)
    category?.scrollIntoView()
}

export function initConfigView(root: HTMLElement): void {
    const status = element<HTMLElement>(root, '[data-status]')
    const retry = element<HTMLButtonElement>(root, '[data-retry]')
    const content = element<HTMLElement>(root, '[data-content]')
    const navigation = element<HTMLElement>(root, '[data-navigation]')
    let loading = false

    async function load(): Promise<void> {
        if (loading) return
        loading = true
        retry.disabled = true
        content.setAttribute('aria-busy', 'true')
        status.textContent = 'Loading configuration…'

        try {
            const response = await fetchConfig(root.dataset.apiUrl ?? '')
            renderConfig(root, response)
            navigation.hidden = response.configs.length === 0
            status.textContent = response.configs.length ? '' : 'No configuration available.'
            retry.hidden = true
            requestAnimationFrame(() => scrollToCategory(root))
        } catch {
            status.textContent = 'Unable to load the configuration. Please try again.'
            retry.hidden = false
        } finally {
            content.setAttribute('aria-busy', 'false')
            retry.disabled = false
            loading = false
        }
    }

    retry.addEventListener('click', () => { void load() })
    void load()
}
