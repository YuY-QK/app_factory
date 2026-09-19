import { z } from "zod";

export const DartPackageNameRegex = /^[a-z][a-z0-9_]*$/;
export const BundleIdRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export const AppConfigSchema = z.object({
  template: z.string().min(1, "Template name is required"),
  app: z.object({
    name: z.string().min(1, "App name is required"),
    packageName: z
      .string()
      .regex(
        DartPackageNameRegex,
        "Package name must start with a lowercase letter and contain only lowercase letters, digits, and underscores"
      ),
    bundleId: z
      .string()
      .regex(BundleIdRegex, "Bundle ID must be in reverse domain format (e.g. com.example.app)"),
    version: z.string().default("1.0.0"),
    buildNumber: z.number().int().positive().default(1),
  }),
  environments: z
    .record(
      z.string(),
      z.object({
        apiBaseUrl: z.string().url().optional(),
      })
    )
    .optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const TemplateDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["flutter", "react-native", "web", "generic"]),
  source: z.string(),
  branch: z.string().default("main"),
  author: z.string().optional(),
});

export const FactoryConfigSchema = z.object({
  version: z.string().default("1.0.0"),
  templates: z.record(z.string(), TemplateDefinitionSchema),
});

export type FactoryConfig = z.infer<typeof FactoryConfigSchema>;

export function validateAppConfig(raw: unknown): AppConfig {
  return AppConfigSchema.parse(raw);
}
