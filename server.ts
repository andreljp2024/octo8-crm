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
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
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
      console.error('Gemini error:', error);
      res.status(500).json({ error: 'Erro ao processar resumo com IA' });
    }
  });

  // Gemini Copilot Customer Insight endpoint
  app.post('/api/copilot/customer-insight', async (req, res) => {
    if (!ai) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
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

      res.json({ summary: response.text });
    } catch (error) {
      console.error('Gemini error:', error);
      res.status(500).json({ error: 'Erro ao gerar insight com IA' });
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
