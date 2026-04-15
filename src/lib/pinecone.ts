import { Pinecone } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const getIndex = () => {
  return pinecone.index(process.env.PINECONE_INDEX || "saas-doc-ai");
};

export async function upsertToNamespace(
  namespace: string,
  vectors: { id: string; values: number[]; metadata: Record<string, string> }[]
) {
  const index = getIndex();
  const ns = index.namespace(namespace);
  await ns.upsert({ records: vectors.map((v) => ({ id: v.id, values: v.values, metadata: v.metadata })) });
}

export async function queryNamespace(
  namespace: string,
  vector: number[],
  topK: number = 5,
  filter?: Record<string, unknown>
) {
  const index = getIndex();
  const ns = index.namespace(namespace);
  const results = await ns.query({
    vector,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  });
  return results.matches || [];
}

export async function deleteFromNamespace(namespace: string, ids: string[]) {
  const index = getIndex();
  const ns = index.namespace(namespace);
  await ns.deleteMany(ids);
}

export function getUserNamespace(userId: string): string {
  return `user-${userId}`;
}

// Simple text to vector embedding using a basic hash approach
// In production, use a proper embedding model
export function textToVector(text: string, dimensions: number = 1024): number[] {
  const vector: number[] = new Array(dimensions).fill(0);
  for (let i = 0; i < text.length; i++) {
    vector[i % dimensions] += text.charCodeAt(i) / 255;
  }
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  return vector;
}

export default pinecone;
