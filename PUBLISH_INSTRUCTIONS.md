# Publishing Guide for Salesforce CLI Plugins

There are two distinct paths for publishing a Salesforce CLI plugin depending on your goal.

---

## Path 1: Publish as a Community/Third-Party Plugin

This is the standard path for non-Salesforce plugins. No submission or approval process required.

### Prerequisites

- Node.js >= 18
- An npm account ([npmjs.com](https://www.npmjs.com/)) — run `npm login` to authenticate
- Your `package.json` is correctly configured (see below)

### package.json Requirements

The following fields must be set:

```json
{
  "publishConfig": { "access": "public" },
  "files": ["/lib", "/messages", "/oclif.manifest.json", "/oclif.lock"],
  "exports": "./lib/index.js",
  "keywords": ["sf-plugin", "sfdx-plugin"]
}
```

- `publishConfig.access` — ensures the package is publicly accessible on npm
- `files` — specifies which files are included in the published package
- `exports` — entry point for ESM consumers
- `keywords` — `sf-plugin` and `sfdx-plugin` make the plugin discoverable via `sf plugins discover`

### Build Scripts

The generated `prepack` and `postpack` scripts handle the build lifecycle automatically:

| Script     | Description                                                                |
| ---------- | -------------------------------------------------------------------------- |
| `prepack`  | Runs `sf-prepack` — builds the project and generates `oclif.manifest.json` |
| `postpack` | Runs `sf-clean` — removes generated artifacts after packing                |

### Publishing

```bash
# 1. Bump the version (creates a git tag automatically)
npm version patch   # or minor, or major

# 2. Publish to npm (prepack runs automatically)
npm publish

# 3. Push the version tag to GitHub
git push --follow-tags
```

### User Installation

Once published, users install the plugin with:

```bash
sf plugins install sf-aidev
```

This pulls the package directly from the npm registry.

### Discoverability

Users can find third-party plugins via:

```bash
sf plugins discover
```

This command indexes npm packages tagged with `oclif-plugin` or `sf-plugin` keywords. Your plugin will appear automatically once published with the correct keywords.

### CI/CD with GitHub Actions

The Salesforce plugin generator (`sf dev generate plugin`) creates sample GitHub Actions workflows in `.github/workflows/*.yml` for:

- **Testing** — run on every PR
- **Releasing** — automated version bumps and npm publishing
- **Publishing** — triggered on tag pushes or releases

See the [Salesforce CLI GitHub Actions](https://github.com/salesforcecli) repos for reference implementations.

---

## Path 2: Become a Core/Official Salesforce CLI Plugin

This path is for plugins maintained by the Salesforce CLI team under the `salesforcecli` GitHub organization.

### Requirements

| Requirement     | Details                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| **GitHub org**  | Repository must be hosted under [github.com/salesforcecli](https://github.com/salesforcecli)                        |
| **npm scope**   | Published as `@salesforce/plugin-*` (e.g., `@salesforce/plugin-deploy-retrieve`)                                    |
| **CLA**         | External contributors must sign a Contributor License Agreement at [cla.salesforce.com](https://cla.salesforce.com) |
| **CI/CD**       | CircleCI with the `npm-release-management-orb` for automated releases                                               |
| **Signing**     | Cryptographic signing via `@salesforce/plugin-trust` — prevents tampering with official packages                    |
| **Quality bar** | 95%+ code coverage, conventional commits, full NUT test suite, documentation                                        |
| **License**     | Apache 2.0                                                                                                          |

### What It Means to Be a Core Plugin

- The plugin is **bundled with every `sf` installation** — listed in the CLI's own `package.json` under `oclif.plugins`
- Follows Salesforce's **weekly release cadence**
- Verified via `sf plugins trust verify` before installation
- Listed in `sf plugins --core` output

### How to Initiate

There is no public self-service submission form. The process requires:

1. **Open a proposal** at [github.com/forcedotcom/cli/issues](https://github.com/forcedotcom/cli/issues) — this is where CLI feature requests and plugin proposals are tracked
2. **Engage the Platform CLI team** — describe the plugin's value proposition, target audience, and how it fits into the Salesforce developer workflow
3. **Meet the quality bar** — 95%+ coverage, conventional commits, full NUT test suite, and comprehensive documentation
4. **Transfer the repository** to the `salesforcecli` GitHub organization upon acceptance

### Realistic Path

For community-developed plugins, Path 1 (npm publish) is the practical starting point. You can pursue Path 2 later once the plugin has traction and Salesforce expresses interest in official adoption.

---

## References

- [Salesforce CLI Plugin Developer Guide](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide)
- [oclif Releasing Guide](https://oclif.io/docs/releasing)
- [Salesforce CLI Plugin Template](https://github.com/salesforcecli/plugin-template-sf)
- [Salesforce CLI Issues & Proposals](https://github.com/forcedotcom/cli/issues)
- [Salesforce CLI Status & Core Plugins](https://github.com/salesforcecli/status)
