// Monorepo-aware Metro config.
//
// Out of the box Metro only looks at one project folder and one node_modules.
// In a pnpm workspace the mobile app's deps may be hoisted to the repo root and
// the shared `@splitplata/core` package lives outside the app folder, so we
// must (1) watch the whole monorepo and (2) let Metro resolve modules from both
// the app's and the root's node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// pnpm uses symlinks heavily; let Metro follow them.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
