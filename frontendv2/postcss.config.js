import tailwindConfig from './tailwind.config.js'

// Under the cf CLI (MIRUBATO_CF=1), cf's config loader installs Node
// module.registerHooks(), which leaves `require.cache` undefined for CommonJS
// loaded via import(). Tailwind 3 relies on it when loading its config by path,
// so hand it the config object instead. Plain `vite build` is unchanged.
export default {
  plugins: {
    tailwindcss: process.env.MIRUBATO_CF === '1' ? tailwindConfig : {},
    autoprefixer: {},
  },
}
