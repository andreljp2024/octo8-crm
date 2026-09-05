import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

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
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Valid messages array is required' });
      }

      const formattedChat = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
      
      const prompt = `
      Analise a conversa de atendimento ao cliente abaixo e forneça uma resposta em formato JSON estrito.
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

      const prompt = `
Você é o agente de IA chamado "${agentName || 'Assistente Octo8'}" de uma plataforma de Contact Center & VoIP multitenant para Provedores de Internet (ISPs) e empresas de Telecomunicações.

DIRETRIZES DO SEU PERSONA / PROMPT DE SISTEMA:
${systemPrompt || 'Você atua no atendimento prestativo ao cliente, sanando dúvidas de suporte, faturas e vendas de planos de internet.'}

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
