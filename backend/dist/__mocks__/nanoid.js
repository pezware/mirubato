// Mock for nanoid
let counter = 0;
export function nanoid(size) {
    counter++;
    const id = `mock_id_${counter}`;
    return size ? id.padEnd(size, '0') : id;
}
//# sourceMappingURL=nanoid.js.map