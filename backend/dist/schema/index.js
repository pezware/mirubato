import { readFileSync } from 'fs';
import { join } from 'path';
// Read the GraphQL schema from the file
export const typeDefs = readFileSync(join(__dirname, 'schema.graphql'), 'utf8');
//# sourceMappingURL=index.js.map