import { handleCodeExecutionRequest } from "@/features/code-execution";
import { getCodeExecutionProvider } from "@/lib/execution/provider";

export async function POST(request: Request): Promise<Response> {
  return handleCodeExecutionRequest(request, getCodeExecutionProvider());
}
