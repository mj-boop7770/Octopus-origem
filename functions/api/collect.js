export async function onRequest(context) {
  const { env, request } = context;

  // Sécurité minimale : vérification d'une clé API ou d'un en-tête d'autorisation si nécessaire
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Base D1 non disponible" }), { status: 503 });
  }

  const TAVILY_KEY = env.TAVILY_API_KEY;
  const GROQ_KEY = env.GROQ_API_KEY;

  if (!TAVILY_KEY || !GROQ_KEY) {
    return new Response(JSON.stringify({ error: "Clés API Tavily ou Groq manquantes dans les variables d'environnement Cloudflare" }), { status: 500 });
  }

  try {
    // 1. Recherche web via Tavily API
    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: "preços agrícolas produtor exportação Moçambique Angola SADC 2026",
        search_depth: "basic",
        max_results: 3
      })
    });
    const tavilyData = await tavilyRes.json();
    const searchContext = JSON.stringify(tavilyData.results || []);

    // 2. Traitement / Extraction structurée via Groq API
    const groqPrompt = `Analyse ces données web et extrait une liste JSON d'objets représentatifs des prix de produits agricoles/maritimes.
Return ONLY a valid JSON array without markdown formatting or code blocks.
Chaque objet doit avoir ces clés exactes :
"pais", "bandeira", "produto", "categoria", "preco_produtor", "unidade_produtor", "preco_produtor_usd_kg", "preco_export", "preco_export_max", "unidade_export", "campanha", "compradores", "fonte", "link", "nota".

Données source: ${searchContext.substring(0, 3000)}`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: groqPrompt }],
        temperature: 0.2
      })
    });

    const groqData = await groqRes.json();
    let rawContent = groqData.choices[0]?.message?.content || "[]";
    
    // Nettoyage pour s'assurer d'obtenir du JSON pur
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const items = JSON.parse(rawContent);

    // 3. Insertion / Mise à jour dans Cloudflare D1
    let insertedCount = 0;
    for (const item of items) {
      if (item.produto && item.pais) {
        await env.DB.prepare(`
          INSERT INTO precos (
            pais, bandeira, produto, categoria, preco_produtor, unidade_produtor,
            preco_produtor_usd_kg, preco_export, preco_export_max, unidade_export,
            campanha, compradores, fonte, link, nota
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          item.pais, item.bandeira || '', item.produto, item.categoria || 'Agrícola',
          item.preco_produtor || null, item.unidade_produtor || '',
          item.preco_produtor_usd_kg || null, item.preco_export || null,
          item.preco_export_max || null, item.unidade_export || '',
          item.campanha || '', item.compradores || '', item.fonte || '',
          item.link || '', item.nota || ''
        ).run();
        insertedCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, count: insertedCount }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
      }
      
