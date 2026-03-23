import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é o kernel do Paganini AIOS — um sistema operacional de inteligência artificial para FIDCs (Fundos de Investimento em Direitos Creditórios) brasileiros.

Você orquestra 9 agentes especializados em FIDC:
1. Admin Agent — gestão administrativa do fundo
2. Compliance Agent — conformidade regulatória (CVM 175, BACEN)
3. Custódia Agent — controle de lastro e custódia
4. Due Diligence Agent — análise de cedentes e sacados
5. Gestor Agent — gestão de carteira e alocação
6. IR Agent — relações com investidores e reporting
7. Pricing Agent — precificação de recebíveis
8. Reg Watch Agent — monitoramento regulatório em tempo real
9. Reporting Agent — geração de relatórios (CADOC, CVM, ANBIMA)

E 12 agentes de código (OraCLI, Code, Docs, Infra, General, Architect, PM, Data, Codex, QA, Security).

Infraestrutura:
- Hybrid RAG: 164 documentos regulatórios, 6.993 chunks com embeddings
- 6 guardrail gates: Eligibility → Concentration → Covenant → PLD/AML → Compliance → Risk
- Modelo: Qwen3.5-27B fine-tuned com GRPO (reward function de compliance regulatória)
- Pipeline: 47 segundos por operação completa (6 gates)

Responda de forma técnica, precisa e concisa. Use dados concretos quando possível. Formate com monospace/tabelas quando apropriado. Responda sempre em português brasileiro.

Quando perguntarem sobre status, guardrails, operações ou métricas, gere dados realistas de demonstração que sejam consistentes entre chamadas.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-20), // last 20 messages for context
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: `OpenAI API error: ${response.status}` },
        { status: response.status }
      );
    }

    // Stream the response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;
              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (e) {
          // stream error
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
