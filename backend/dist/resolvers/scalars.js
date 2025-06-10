import { GraphQLScalarType, Kind } from 'graphql';
export const scalarResolvers = {
    DateTime: new GraphQLScalarType({
        name: 'DateTime',
        description: 'DateTime custom scalar type',
        serialize(value) {
            if (value instanceof Date) {
                return value.toISOString();
            }
            return value;
        },
        parseValue(value) {
            return new Date(value);
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.STRING) {
                return new Date(ast.value);
            }
            return null;
        },
    }),
    JSON: new GraphQLScalarType({
        name: 'JSON',
        description: 'JSON custom scalar type',
        serialize(value) {
            return value;
        },
        parseValue(value) {
            return value;
        },
        parseLiteral(ast) {
            switch (ast.kind) {
                case Kind.STRING:
                    return JSON.parse(ast.value);
                case Kind.OBJECT:
                    return parseObject(ast);
                default:
                    return null;
            }
        },
    }),
};
function parseObject(ast) {
    const value = Object.create(null);
    ast.fields.forEach(field => {
        value[field.name.value] = parseValue(field.value);
    });
    return value;
}
function parseValue(ast) {
    switch (ast.kind) {
        case Kind.STRING:
        case Kind.BOOLEAN:
            return ast.value;
        case Kind.INT:
        case Kind.FLOAT:
            return parseFloat(ast.value);
        case Kind.OBJECT:
            return parseObject(ast);
        case Kind.LIST:
            return ast.values.map(parseValue);
        default:
            return null;
    }
}
//# sourceMappingURL=scalars.js.map