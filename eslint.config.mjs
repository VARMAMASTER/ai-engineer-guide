import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * The mini-apps are bounded contexts (spec 2026-09-14, section 4.2): Diet,
 * Train, Ops and Learn each own their routes, logic and schema namespace, and
 * none may import another. Deleting any one must leave the rest building.
 *
 * That boundary is enforced here rather than described in a document, because a
 * boundary that lives only in a spec lasts until the first deadline — and it
 * never breaks loudly. It breaks as one convenient import that looks entirely
 * reasonable in review.
 *
 * Two things legitimately see more than one app, and neither needs an
 * exception: `lib/summary` is the flat seam every app publishes into, and the
 * agent reads apps through that same seam. Anything that genuinely needs more
 * gets a richer shared type in `lib/summary`, never a direct import of another
 * app's internals — which is the exact move this rule exists to prevent.
 */
const APPS = ["diet", "train", "ops", "learn"];

const boundaryRules = APPS.map((app) => ({
  files: [`lib/${app}/**/*.{ts,tsx}`, `app/${app}/**/*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        // One group per foreign app, covering every spelling that reaches it.
        //
        // The relative forms are not decoration. `no-restricted-imports`
        // matches the import STRING, not the resolved path, so `../diet/energy`
        // contains no `lib/diet` for an alias pattern to catch — a rule written
        // with only the `@/` forms passes a probe using the alias and silently
        // allows the identical import written relatively. This was verified by
        // probing both spellings, and the relative one escaped the first draft.
        //
        // A bare `${other}` segment is safe to restrict here because the
        // self-app is filtered out above: files under `lib/diet/**` are never
        // given the `diet` pattern, so a same-app relative import is unaffected.
        patterns: APPS.filter((other) => other !== app).map((other) => ({
          group: [
            `@/lib/${other}`,
            `@/lib/${other}/*`,
            `@/app/${other}`,
            `@/app/${other}/*`,
            `**/lib/${other}/**`,
            `**/app/${other}/**`,
            `**/${other}`,
            `**/${other}/**`,
          ],
          message:
            `The ${app} app may not import from ${other}. Mini-apps are bounded contexts: ` +
            `publish what another app needs through lib/summary instead. See spec section 4.2.`,
        })),
      },
    ],
  },
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...boundaryRules,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
