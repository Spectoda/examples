import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EVALUATION_ROOT = path.join(ROOT, "creator-kit-evaluations");

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export async function evaluateAgent(agent) {
  const questions = await json(path.join(EVALUATION_ROOT, "questions.json"));
  const responseDocument = await json(path.join(EVALUATION_ROOT, "responses", `${agent}.json`));
  const responses = new Map(responseDocument.responses.map((response) => [response.id, response]));
  const results = questions.map((question) => {
    const response = responses.get(question.id);
    const citationOk = question.expected.citation ? response?.citations?.includes(question.expected.citation) : true;
    const abstentionOk = response?.abstained === question.expected.abstain;
    return {
      id: question.id,
      passed: Boolean(response && citationOk && abstentionOk),
      citationOk,
      abstentionOk,
    };
  });
  return { agent, passed: results.every((result) => result.passed), results };
}

export async function evaluateAllAgents() {
  const evaluations = await Promise.all([evaluateAgent("codex"), evaluateAgent("claude")]);
  return { harness: "public-bundle-agent-objective-v1", pilotStatus: "not-run", passed: evaluations.every((evaluation) => evaluation.passed), evaluations };
}

async function main() {
  const result = await evaluateAllAgents();
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch((error) => {
  console.error(`Creator Kit agent evaluation failed: ${error.message}`);
  process.exitCode = 1;
});
