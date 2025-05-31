import { GraphQLScalarType, Kind, ValueNode, ObjectValueNode } from 'graphql'

export const scalarResolvers = {
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value: unknown) {
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    },
    parseValue(value: unknown) {
      return new Date(value as string | number | Date)
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return new Date(ast.value)
      }
      return null
    },
  }),

  JSON: new GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize(value: unknown) {
      return value
    },
    parseValue(value: unknown) {
      return value
    },
    parseLiteral(ast) {
      switch (ast.kind) {
        case Kind.STRING:
          return JSON.parse(ast.value)
        case Kind.OBJECT:
          return parseObject(ast)
        default:
          return null
      }
    },
  }),
}

function parseObject(ast: ObjectValueNode): Record<string, unknown> {
  const value: Record<string, unknown> = Object.create(null)
  ast.fields.forEach(field => {
    value[field.name.value] = parseValue(field.value)
  })
  return value
}

function parseValue(ast: ValueNode): unknown {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value)
    case Kind.OBJECT:
      return parseObject(ast)
    case Kind.LIST:
      return ast.values.map(parseValue)
    default:
      return null
  }
}
