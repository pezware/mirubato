// This is a minimal worker that serves static assets
export default {
  async fetch(request, env, ctx) {
    // Workers automatically serves files from the assets directory
    return env.ASSETS.fetch(request);
  },
};