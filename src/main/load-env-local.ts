import fs from 'fs';
import path from 'path';
import { config as loadDotenv } from 'dotenv';

function normalizePath(candidate: string): string {
  return path.normalize(candidate);
}

export default function loadEnvLocal(candidates: string[]): string | null {
  const uniqueCandidates = Array.from(
    new Set(candidates.map((candidate) => normalizePath(candidate))),
  );

  const selectedCandidate =
    uniqueCandidates.find((candidate) => fs.existsSync(candidate)) ?? null;

  if (selectedCandidate) {
    loadDotenv({
      path: selectedCandidate,
      override: false,
    });
  }

  return selectedCandidate;
}


