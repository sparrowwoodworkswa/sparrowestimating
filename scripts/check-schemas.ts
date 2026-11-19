import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AnalysisSchema, PackageResultSchema, ProposalSchema, LearnSchema } from "../src/lib/ai/schemas";
for (const [n, s] of Object.entries({ AnalysisSchema, PackageResultSchema, ProposalSchema, LearnSchema })) {
  const f = betaZodOutputFormat(s as any) as any;
  const js = JSON.stringify(f.schema ?? f);
  console.log(n, "ok", js.length, "bytes", /"additionalProperties":false/.test(js) ? "strict" : "NOT strict");
  // sample parse
}
const sample = { lines: [{ division: "03", csiCode: "03 30 00", description: "x", scope: "y", qty: 1, unit: "CY", laborRole: "none", laborHoursPerUnit: 0, materialUnit: 0, subUnit: 300, isAllowance: false, trade: "Concrete", note: "", pricingBasis: "catalog" }], tradePackages: [], emptyDivisions: [] };
console.log("parse", PackageResultSchema.safeParse(sample).success);
