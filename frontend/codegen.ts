import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: '../backend/src/schema/schema.graphql',
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    'src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        withHooks: true,
        withComponent: false,
        withHOC: false,
        skipTypename: false,
        apolloReactHooksImportFrom: '@apollo/client',
        apolloReactCommonImportFrom: '@apollo/client',
        documentMode: 'documentNode',
        // Ensure enums match backend exactly
        enumsAsTypes: true,
        // Add proper scalar mappings
        scalars: {
          DateTime: 'string',
          JSON: 'Record<string, unknown>',
        },
        // Naming conventions for generated hooks
        omitOperationSuffix: false,
        dedupeOperationSuffix: true,
        pureMagicComment: true,
        // Add __typename for better cache management
        addTypename: true,
      },
    },
    // Also generate introspection file for better IDE support
    'src/generated/introspection.json': {
      plugins: ['introspection'],
      config: {
        minify: true,
      },
    },
  },
  // Hooks to run after generation
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
}

export default config
