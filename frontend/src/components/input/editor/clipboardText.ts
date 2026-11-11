import type {Fragment, Node as PMNode, Slice} from '@tiptap/pm/model'

const LIST_TYPES = ['bulletList', 'orderedList', 'taskList']

function leafText(leaf: PMNode): string {
	if (leaf.type.name === 'hardBreak') {
		return '\n'
	}
	const fromSpec = leaf.type.spec.leafText
	if (typeof fromSpec === 'function') {
		return fromSpec(leaf)
	}
	return ''
}

function serializeFragment(fragment: Fragment, lines: string[]) {
	fragment.forEach(node => serializeNode(node, lines))
}

function serializeList(list: PMNode, lines: string[]) {
	let index = typeof list.attrs.start === 'number' ? list.attrs.start : 1
	list.forEach(item => {
		let marker = '- '
		if (list.type.name === 'orderedList') {
			marker = `${index++}. `
		} else if (list.type.name === 'taskList') {
			marker = `- [${item.attrs.checked ? 'x' : ' '}] `
		}

		const itemLines: string[] = []
		serializeFragment(item.content, itemLines)
		if (itemLines.length === 0) {
			itemLines.push('')
		}

		const padding = ' '.repeat(marker.length)
		itemLines.forEach((line, i) => {
			lines.push((i === 0 ? marker : padding) + line)
		})
	})
}

function serializeNode(node: PMNode, lines: string[]) {
	if (LIST_TYPES.includes(node.type.name)) {
		serializeList(node, lines)
		return
	}

	if (node.isTextblock) {
		const text = node.textBetween(0, node.content.size, '\n', leafText)
		lines.push(...text.split('\n').map(line => line.trimEnd()))
		return
	}

	if (node.isText) {
		lines.push(node.text ?? '')
		return
	}

	if (node.isLeaf) {
		const text = leafText(node)
		if (text !== '') {
			lines.push(text)
		}
		return
	}

	serializeFragment(node.content, lines)
}

/**
 * Serializes a copied slice to plain text, keeping list markers ("- ", "1. ",
 * "- [ ] ") so pasting into a plain text field still reads as a list.
 */
export function serializeSliceAsText(slice: Slice): string {
	const content = slice.content
	if (content.childCount === 0) {
		return ''
	}

	// Only inline content (part of a single paragraph): copy it verbatim.
	if (content.firstChild?.isInline) {
		return content.textBetween(0, content.size, '\n', leafText)
	}

	const lines: string[] = []
	serializeFragment(content, lines)
	return lines.join('\n')
}
