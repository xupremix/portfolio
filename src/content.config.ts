import { z, defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

const projectsCollection = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    tech: z.array(z.string()),
    href: z.string().url(),
    anchor: z.string().optional(),
    status: z.enum(['in-progress', 'team']).optional(),
    teamCredit: z.string().optional(),
    impact: z.string().optional(),
    role: z.string().optional(),
    demoId: z.string().optional(),
    wide: z.boolean().optional(),
    index: z.number().optional()
  })
});

export const collections = {
  projects: projectsCollection,
};
