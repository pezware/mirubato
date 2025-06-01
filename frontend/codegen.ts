import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
  overwrite: true,
  schema: '../backend/src/schema/schema.graphql', // Use schema file directly
  documents: ['src/**/*.{ts,tsx}', '!src/gql/**/*'], // Where to look for GraphQL operations
  generates: {
    'src/gql/': {
      preset: 'client',
      plugins: [],
      config: {
        // Use TypeScript enums for better type safety
        enumsAsTypes: false,
        // Add __typename to operations for better caching
        addTypename: true,
        // Generate React hooks
        withHooks: true,
        // Generate HOCs
        withHOC: false,
        // Generate components
        withComponent: false,
      },
    },
    'src/gql/apollo-helpers.ts': {
      plugins: ['typescript-react-apollo'],
      config: {
        withHooks: true,
        withHOC: false,
        withComponent: false,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
}

export default config
