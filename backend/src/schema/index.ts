import { readFileSync } from 'fs'
import { join } from 'path'

// Simple path resolution that works in both Jest and runtime
const schemaPath = join(__dirname, 'schema.graphql')
export const typeDefs = readFileSync(schemaPath, 'utf-8')
