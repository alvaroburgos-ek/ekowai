import { z } from 'zod';
import type { Worksheet, ExpressionAst } from './types';

const SelectOptionSchema = z.object({
  value: z.string(),
  labelDe: z.string(),
  labelEn: z.string(),
});

const InputFieldSchema = z.object({
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
  type: z.enum(['number', 'select', 'text', 'boolean']),
  labelDe: z.string(),
  labelEn: z.string(),
  unit: z.string().optional(),
  citation: z.string(),
  helpDe: z.string().optional(),
  helpEn: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(SelectOptionSchema).optional(),
  defaultValue: z.union([z.number(), z.string(), z.boolean()]).optional(),
});

const ExpressionAstSchema: z.ZodType<ExpressionAst> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('lit'), value: z.number() }),
    z.object({ kind: z.literal('ref'), id: z.string() }),
    z.object({
      kind: z.literal('op'),
      op: z.enum(['+', '-', '*', '/']),
      lhs: ExpressionAstSchema,
      rhs: ExpressionAstSchema,
    }),
    z.object({
      kind: z.literal('fn'),
      fn: z.enum(['min', 'max', 'round', 'ceil', 'floor']),
      args: z.array(ExpressionAstSchema),
    }),
    z.object({
      kind: z.literal('cond'),
      if: ExpressionAstSchema,
      then: ExpressionAstSchema,
      else: ExpressionAstSchema,
    }),
    z.object({
      kind: z.literal('cmp'),
      op: z.enum(['<', '<=', '>', '>=', '==', '!=']),
      lhs: ExpressionAstSchema,
      rhs: ExpressionAstSchema,
    }),
  ]),
);

const ComputedFieldSchema = z.object({
  id: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
  labelDe: z.string(),
  labelEn: z.string(),
  unit: z.string().optional(),
  citation: z.string(),
  expression: ExpressionAstSchema,
  precision: z.number().int().min(0).max(6).optional(),
});

const ComplianceThresholdSchema = z.object({
  id: z.string(),
  ref: z.string(),
  rule: z.object({
    kind: z.enum(['lte', 'gte', 'eq']),
    value: z.number(),
  }),
  severity: z.enum(['warning', 'blocking']),
  messageDe: z.string(),
  messageEn: z.string(),
  citation: z.string(),
});

const DecisionOptionSchema = z.object({
  value: z.string(),
  labelDe: z.string(),
  labelEn: z.string(),
});

const DecisionPointSchema = z.object({
  id: z.string(),
  labelDe: z.string(),
  labelEn: z.string(),
  promptDe: z.string(),
  promptEn: z.string(),
  citation: z.string(),
  options: z.array(DecisionOptionSchema).min(2),
  triggerWhen: ExpressionAstSchema.optional(),
});

const SectionSchema = z.object({
  id: z.string(),
  titleDe: z.string(),
  titleEn: z.string(),
  fields: z.array(z.string()).min(1),
});

export const WorksheetSchema = z.object({
  contractVersion: z.literal('1.0'),
  regulation: z.string(),
  regulationVersion: z.string(),
  id: z.string(),
  titleDe: z.string(),
  titleEn: z.string(),
  sourceCitation: z.string(),
  status: z.enum(['verified', 'preview']).default('preview'),
  inputs: z.array(InputFieldSchema),
  computed: z.array(ComputedFieldSchema),
  thresholds: z.array(ComplianceThresholdSchema),
  sections: z.array(SectionSchema).min(1),
  decisionPoints: z.array(DecisionPointSchema).default([]),
}) satisfies z.ZodType<Worksheet>;

export function parseWorksheet(json: unknown): Worksheet {
  return WorksheetSchema.parse(json);
}
