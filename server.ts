import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, FunctionDeclaration, Type, Schema } from '@google/genai';
import { MockSgpAdapter } from './src/lib/integration-hub/SgpAdapter';
import { MockPbxAdapter } from './src/lib/integration-hub/PbxAdapter';
import { globalQueueEngine, QueuedInteraction } from './src/lib/routing/QueueEngine';
import { requireAuth, requirePermission, AuthRequest } from './src/server/middleware/auth.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Gemini API
  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  // Middleware para parsear JSON
  app.use(express.json());

  // Rotas da API (Fase 2 - Backend)
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'octo8-core', timestamp: new Date().toISOString() });
  });

  // (Fase 2) Routing Engine - Fila Endpoint
  app.get('/api/routing/queue-metrics', (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default-tenant';
    const metrics = globalQueueEngine.getQueueMetrics(tenantId);
    res.json(metrics);
  });

  // (Fase 2) Routing Engine - Atualizar Status do Agente
  app.post('/api/routing/agent-status', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default-tenant';
    const { agentId, status, skills, maxCapacity, reasonCode } = req.body;
    
    if (!agentId || !status) {
      return res.status(400).json({ error: 'agentId and status are required' });
    }
    
    globalQueueEngine.updateAgentStatus({
      agentId,
      tenantId,
      status,
      skills: skills || ['suporte', 'vendas'],
      currentCapacity: 0, // Simplified for sandbox
      maxCapacity: maxCapacity || 3,
      lastAssignedTime: Date.now()
    });

    try {
      const { db } = await import('./src/lib/firebase.ts');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const logId = Math.random().toString(36).substring(7);
      // Save status log for WFM
      await setDoc(doc(db, `tenants/${tenantId}/agent_status_logs/${logId}`), {
        id: logId, // Just a sandbox ID
        tenantId,
        agentId,
        status,
        reasonCode: reasonCode || '',
        startedAt: Date.now(),
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Could not write agent status log", e);
    }
    
    res.json({ success: true, agentId, status });
  });

  // Mock endpoint para forçar uma nova interação na fila
  app.post('/api/routing/test-enqueue', (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default-tenant';
    const interaction = {
      id: `interaction-${Date.now()}`,
      tenantId,
      type: 'WHATSAPP',
      customerId: 'test-customer',
      priority: 1,
      enqueueTime: Date.now(),
      status: 'HUMAN_REQUESTED' as const
    };
    globalQueueEngine.enqueueInteraction(interaction);
    res.json({ success: true, interaction });
  });

  // (Fase 3) Omnichannel - Buscar tickets distribuidos para o Agente logado
  app.get('/api/routing/agent-assignments/:agentId', (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default-tenant';
    const assignments = globalQueueEngine.getAssignedInteractions(req.params.agentId, tenantId);
    res.json({ assignments });
  });

  // (Fase 3/4) Integration Hub - SGP Endpoint (Protected via RBAC)
  app.get('/api/integration/customer/:id', requireAuth as any, requirePermission('view_dashboard') as any, async (req: any, res) => {
    try {
      // Now using actual Tenant Context derived from the JWT Token by the Auth Middleware
      const tenantId = req.user?.tenantId || 'default-tenant';
      
      console.log(`[Backend Auth] Request by UID: ${req.user?.uid} | Tenant: ${tenantId} | Role: ${req.user?.role}`);

      const sgpAdapter = new MockSgpAdapter(tenantId);
      const customer = await sgpAdapter.getCustomer(req.params.id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found in SGP' });
      }

      const connection = await sgpAdapter.getConnectionStatus(req.params.id);

      res.json({
        ...customer,
        network_status: connection
      });
    } catch (error) {
      console.error('[Integration Hub] Error:', error);
      res.status(500).json({ error: 'Failed to fetch external customer data' });
    }
  });

  // Mock endpoint para simular busca de métricas
  app.get('/api/metrics', (req, res) => {
    res.json({
      mrr: 412500,
      activeCustomers: 4852,
      churnRisk: 38
    });
  });

  // Gemini Copilot Summarize endpoint
  app.post('/api/copilot/summarize', async (req, res) => {
    const fallbackResponse = {
      summary: "Cliente relatou queda de conexão de fibra (LOS vermelho). O bot de triagem coletou dados cadastrais e transferiu para o suporte N1 com prioridade média.",
      sentiment: "NEGATIVO",
      suggestion: "Olá! Já localizei sua assinatura. Nossa equipe de infraestrutura já identificou a instabilidade na fibra óptica da sua região e a previsão de retorno é de 40 minutos."
    };

    if (!ai) {
      return res.json(fallbackResponse);
    }

    try {
      const { messages, context } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Valid messages array is required' });
      }

      const formattedChat = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      
      const prompt = `
      Analise a conversa de atendimento ao cliente abaixo e forneça uma resposta em formato JSON estrito.
      Considere este contexto adicional (Opcional): ${context || 'Nenhum contexto de fila/sistema fornecido.'}
      
      A resposta deve obedecer exatamente à estrutura abaixo:
      {
        "summary": "Resumo conciso do problema relatado na conversa em até 2 frases.",
        "sentiment": "POSITIVO", "NEUTRO", ou "NEGATIVO" (apenas uma destas palavras),
        "suggestion": "Uma sugestão de próxima frase direta que o agente humano poderia enviar ao cliente para resolver ou acalmar a situação."
      }

      Conversa:
      ${formattedChat}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const jsonResult = JSON.parse(response.text || '{}');
      res.json(jsonResult);
    } catch (error) {
      console.error('Gemini error, serving telecom intelligence fallback:', error);
      res.json(fallbackResponse);
    }
  });

  // Gemini Copilot Customer Insight endpoint
  app.post('/api/copilot/customer-insight', async (req, res) => {
    const fallbackSummary = "A carteira monitorada exibe saúde financeira sólida, porém demanda intervenção urgente na Clínica Bem Estar (Health Score 35, risco iminente de cancelamento por instabilidade técnica). Recomenda-se contato imediato da gerência de contas para prevenção de churn, enquanto TechCorp Brasil (Score 92) e Alpha Logística (Score 88) configuram alvos ideais para upsell de link redundante e telefonia em nuvem.";

    if (!ai) {
      return res.json({ summary: fallbackSummary });
    }

    try {
      const { context } = req.body;
      if (!context) {
        return res.status(400).json({ error: 'Context is required' });
      }

      const prompt = `
      Atue como um analista de Customer Success sênior. Eu vou te passar uma lista de clientes extraída do meu CRM, contendo o nome, status, segmento, saúde da conta (Health Score de 0 a 100) e MRR (Receita Mensal Recorrente).
      
      Sua tarefa é ler essa lista e gerar um **Resumo Executivo da Carteira** em exatamente 1 parágrafo claro, direto e focado em ação. Não inclua saudações nem listas. Apenas o texto corrido.
      
      Instruções específicas:
      1. Identifique e cite pelo nome os clientes com Health Score crítico (abaixo de 50) que representam risco de churn.
      2. Aponte oportunidades ou onde a atenção deve ser focada.
      3. Seja profissional e direto.

      Lista de Clientes:
      ${context}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ summary: response.text || fallbackSummary });
    } catch (error) {
      console.error('Gemini error, serving portfolio insight fallback:', error);
      res.json({ summary: fallbackSummary });
    }
  });

  // AI Feedback endpoint
  app.post('/api/copilot/agent-chat/feedback', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string || 'default-tenant';
    const { interactionId, agentName, rating, comment, correctedContent } = req.body;
    
    if (!interactionId || !rating) {
      return res.status(400).json({ error: 'interactionId and rating are required' });
    }

    try {
      const { db } = await import('./src/lib/firebase.ts');
      const { doc, setDoc } = await import('firebase/firestore');
      
      const logId = Math.random().toString(36).substring(7);
      await setDoc(doc(db, `tenants/${tenantId}/ai_feedback_logs/${logId}`), {
        id: logId,
        tenantId,
        interactionId,
        aiAgentId: agentName || 'unknown-agent',
        rating,
        comment: comment || '',
        correctedContent: correctedContent || '',
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, logId });
    } catch (error) {
      console.error('Feedback error:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  });

  // Gemini Interactive Agent Chat Playground
  app.post('/api/copilot/agent-chat', async (req, res) => {
    const { agentName, systemPrompt, message, history } = req.body;

    const fallbackReply = `Olá! Sou o agente ${agentName || 'Octo8 Bot'}. Compreendi sua mensagem ("${message}"). Em um ambiente de telecom/ISP, estou preparado para direcionar sua solicitação para a fila apropriada ou consultar seu contrato no SGP. Como posso prosseguir com o seu suporte?`;

    if (!ai) {
      return res.json({ reply: fallbackReply });
    }

    try {
      const formattedHistory = Array.isArray(history) 
        ? history.slice(-6).map((h: any) => `${h.role === 'user' ? 'Cliente' : 'Agente'}: ${h.text}`).join('\n')
        : '';

      const { db } = await import('./src/lib/firebase.ts');
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      
      const tenantId = req.headers['x-tenant-id'] as string || 'octo8-tenant-01';

      // RAG: Retrieve knowledge base context for this tenant
      let ragContext = "";
      try {
        const kbQuery = query(
          collection(db, `tenants/${tenantId}/kb_articles`),
          where('aiSynced', '==', true)
        );
        const kbSnapshot = await getDocs(kbQuery);
        
        if (!kbSnapshot.empty) {
           ragContext = "BASE DE CONHECIMENTO (RAG):\n" + kbSnapshot.docs.map((doc: any) => {
             const data = doc.data();
             return `Título: ${data.title}\nConteúdo: ${data.content}`;
           }).join('\n\n---\n\n');
        } else {
           console.log("[RAG] No articles found for tenant:", tenantId);
        }
      } catch (err) {
        console.warn("Could not retrieve RAG context", err);
      }

      const prompt = `
Você é o agente de IA chamado "${agentName || 'Assistente Octo8'}" de uma plataforma de Contact Center & VoIP multitenant para Provedores de Internet (ISPs) e empresas de Telecomunicações.

DIRETRIZES DO SEU PERSONA / PROMPT DE SISTEMA:
${systemPrompt || 'Você atua no atendimento prestativo ao cliente, sanando dúvidas de suporte, faturas e vendas de planos de internet.'}

### IMPORTANTE: BASE DE CONHECIMENTO ###
Você DEVE utilizar as informações abaixo para basear suas respostas, caso o contexto da pergunta se encaixe.
${ragContext}
########################################

HISTÓRICO RECENTE:
${formattedHistory}

MENSAGEM ATUAL DO CLIENTE:
"${message}"

Responda de forma concisa, educada e direta ao ponto, como se estivesse no chat de atendimento ao vivo (1 a 3 parágrafos curtos).
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ reply: response.text || fallbackReply });
    } catch (error) {
      console.error('Gemini error in agent-chat:', error);
      res.json({ reply: fallbackReply });
    }
  });

  // Gemini KB Excerpt Generator
  app.post('/api/copilot/kb-excerpt', async (req, res) => {
    const { content } = req.body;
    const fallbackExcerpt = "Resumo gerado automaticamente indisponível. (Modo offline/fallback ativado).";

    if (!ai) {
      return res.json({ excerpt: fallbackExcerpt });
    }

    try {
      if (!content) return res.status(400).json({ error: 'Content is required' });

      const prompt = `
      Leia o seguinte conteúdo de um artigo de Base de Conhecimento (Contact Center / Telecom).
      Gere um resumo altamente conciso em exatas 2 frases (máximo 120 caracteres no total). 
      Este resumo será usado como 'excerpt' e indexado para buscas RAG por agentes virtuais.
      
      Conteúdo do Artigo:
      ${content}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      res.json({ excerpt: response.text || fallbackExcerpt });
    } catch (error) {
      console.error('Gemini error in kb-excerpt:', error);
      res.json({ excerpt: fallbackExcerpt });
    }
  });

  // Gemini AI Automation Test Agent endpoint
  app.post('/api/copilot/test-agent', async (req, res) => {
    const fallbackReply = "Desculpe, não consegui conectar à inteligência artificial no momento. Verifique a chave de API.";

    if (!ai) {
      return res.json({ reply: fallbackReply });
    }

    try {
      const { systemPrompt, message, history = [] } = req.body;
      if (!systemPrompt || !message) {
        return res.status(400).json({ error: 'systemPrompt and message are required' });
      }

      // Convert history to genai SDK format
      const formattedHistory = history.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));

      const tools: any = [{
        functionDeclarations: [
          {
            name: "consultarClienteSGP",
            description: "Consulta os dados cadastrais de um cliente no sistema SGP.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                customerId: {
                  type: Type.STRING,
                  description: "O ID do cliente para consulta"
                }
              },
              required: ["customerId"]
            }
          },
          {
            name: "consultarConexaoSGP",
            description: "Consulta o status da conexão de fibra (ONU) e potência óptica do cliente.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                customerId: {
                  type: Type.STRING,
                  description: "O ID do cliente para consultar a conexão"
                }
              },
              required: ["customerId"]
            }
          }
        ]
      }];

      const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.5,
          tools: tools,
        },
        history: formattedHistory
      });

      let response = await chat.sendMessage({ message });
      
      // Handle function calls (Tool Registry execution loop)
      if (response.functionCalls && response.functionCalls.length > 0) {
        const sgpAdapter = new MockSgpAdapter('default-tenant');
        const functionResponses = [];
        
        for (const call of response.functionCalls) {
          console.log(`[Tool Registry] Executing ${call.name}`);
          let result = {};
          if (call.name === 'consultarClienteSGP') {
            result = await sgpAdapter.getCustomer((call.args as any).customerId) || { error: "Customer not found" };
          } else if (call.name === 'consultarConexaoSGP') {
            result = await sgpAdapter.getConnectionStatus((call.args as any).customerId) || { error: "Connection not found" };
          }
          
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: result
            }
          });
        }
        
        // Send function results back to the model
        response = await chat.sendMessage(functionResponses as any);
      }

      const reply = response.text || "Desculpe, sem resposta gerada.";
      
      res.json({ reply });
    } catch (error) {
      console.error('Gemini test agent error:', error);
      res.json({ reply: "Houve um erro de comunicação com o modelo LLM configurado." });
    }
  });

  // Vite middleware para desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Octo8 Core] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
