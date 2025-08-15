/**
 * Custom ESLint rules for typography consistency in Mirubato
 *
 * These rules enforce our three-font design system:
 * - Noto Serif (font-serif): Music titles, composers, musical content
 * - Inter (font-inter): UI elements, metadata, body text
 * - Lexend (font-lexend): Headers and section titles
 */

export const typographyRules = {
  'prefer-typography-components': {
    meta: {
      type: 'suggestion',
      docs: {
        description:
          'Prefer Typography components over direct font classes for music content',
        category: 'Design System',
        recommended: true,
      },
      messages: {
        preferMusicTitle:
          'Consider using <MusicTitle> component instead of manual font-serif for music titles',
        preferMusicComposer:
          'Consider using <MusicComposer> component instead of manual font-serif for composers',
        preferTypographyComponent:
          'Consider using Typography components for better consistency',
      },
      schema: [],
    },
    create(context) {
      return {
        JSXElement(node) {
          // Check for music-related content that should use Typography components
          const openingElement = node.openingElement

          if (openingElement.name && openingElement.name.name) {
            const elementName = openingElement.name.name

            // Check for h1-h6 or other text elements with font-serif
            if (
              ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div'].includes(
                elementName
              )
            ) {
              const classNameAttr = openingElement.attributes.find(
                attr => attr.name && attr.name.name === 'className'
              )

              if (classNameAttr && classNameAttr.value) {
                const classValue = classNameAttr.value.value || ''

                // Check for font-serif usage that might benefit from Typography components
                if (classValue.includes('font-serif')) {
                  // Try to determine if this is likely music content
                  const textContent = getTextContent(node)
                  if (isLikelyMusicContent(textContent)) {
                    context.report({
                      node: classNameAttr,
                      messageId: 'preferTypographyComponent',
                    })
                  }
                }
              }
            }
          }
        },
      }
    },
  },

  'enforce-font-hierarchy': {
    meta: {
      type: 'error',
      docs: {
        description: 'Enforce proper font hierarchy in the design system',
        category: 'Design System',
        recommended: true,
      },
      messages: {
        incorrectFontUsage:
          'Incorrect font usage: {{actual}} should be {{expected}} for {{context}}',
        missingMusicTypography:
          'Music content should use font-serif (Noto Serif)',
        missingUITypography: 'UI elements should use font-inter',
        missingHeaderTypography: 'Headers should use font-lexend',
      },
      schema: [],
    },
    create(context) {
      return {
        JSXAttribute(node) {
          if (node.name.name === 'className' && node.value) {
            const classValue = node.value.value || ''

            // Check for problematic font combinations
            if (classValue.includes('font-sans')) {
              context.report({
                node,
                messageId: 'incorrectFontUsage',
                data: {
                  actual: 'font-sans',
                  expected: 'font-inter',
                  context: 'UI elements',
                },
              })
            }

            if (classValue.includes('font-mono')) {
              context.report({
                node,
                messageId: 'incorrectFontUsage',
                data: {
                  actual: 'font-mono',
                  expected: 'font-inter or font-serif',
                  context: 'text content',
                },
              })
            }
          }
        },
      }
    },
  },
}

/**
 * Extract text content from JSX node (simplified)
 */
function getTextContent(node) {
  if (node.type === 'Literal') {
    return node.value
  }
  if (node.children) {
    return node.children
      .map(child => getTextContent(child))
      .join('')
      .toLowerCase()
  }
  return ''
}

/**
 * Heuristic to determine if content is likely music-related
 */
function isLikelyMusicContent(text) {
  const musicKeywords = [
    'symphony',
    'sonata',
    'concerto',
    'prelude',
    'fugue',
    'etude',
    'op.',
    'opus',
    'bwv',
    'k.',
    'movement',
    'allegro',
    'adagio',
    'bach',
    'mozart',
    'beethoven',
    'chopin',
    'brahms',
    'debussy',
    'title',
    'composer',
    'piece',
  ]

  return musicKeywords.some(keyword => text.includes(keyword))
}
