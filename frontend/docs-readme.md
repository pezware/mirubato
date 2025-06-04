# Mirubato Documentation

## Overview

This repository uses automated documentation generation for the frontend TypeScript/React codebase.

## Documentation Types

1. **API Documentation**: Auto-generated from TypeScript source code using TypeDoc

   - Available at: https://pezware.github.io/mirubato/api-docs/
   - Includes all modules, components, services, and utilities
   - Updated automatically on every push to main

2. **Project Documentation**: Hand-written guides and specifications
   - Located in `/docs` directory
   - Includes architecture decisions, development guides, and roadmaps

## Local Documentation Generation

To generate documentation locally:

```bash
# Install dependencies
npm install

# Generate frontend documentation
cd frontend
npm run docs:generate

# View generated docs
open public/docs/index.html
```

## Documentation Standards

When writing code, please follow these documentation standards:

### TypeScript/JSDoc Comments

````typescript
/**
 * Brief description of the class/function
 *
 * @category CategoryName (e.g., Core, UI Components, Services)
 * @example
 * ```typescript
 * const example = new ExampleClass();
 * example.doSomething();
 * ```
 */
export class ExampleClass {
  /**
   * Method description
   * @param param - Parameter description
   * @returns Return value description
   */
  doSomething(param: string): void {
    // Implementation
  }
}
````

### Categories

Use these standard categories in your `@category` tags:

- **Core**: Core functionality and infrastructure
- **UI Components**: React components
- **Services**: Service layer classes
- **Utilities**: Helper functions and utilities
- **Analytics**: Analytics and reporting modules
- **Practice**: Practice session related modules
- **Performance**: Performance tracking modules
- **Audio**: Audio-related functionality
- **Contexts**: React contexts
- **Types**: TypeScript type definitions

## Continuous Integration

Documentation is automatically:

1. Generated on every push to main
2. Deployed to GitHub Pages
3. Available as artifacts on pull requests for review

## Troubleshooting

If documentation generation fails:

1. Check for TypeScript errors: `npm run type-check`
2. Ensure all exports are properly typed
3. Check TypeDoc warnings in the build output
4. Verify file paths in `typedoc.json`

## Contributing

When adding new modules or components:

1. Add appropriate JSDoc comments
2. Include `@category` tags
3. Add usage examples where appropriate
4. Ensure your code passes type checking
