export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Base de données D1 non disponible" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT 
        id, 
        nom, 
        categorie, 
        pays, 
        produits, 
        statut_confiance AS confiance, 
        derniere_verification 
      FROM v_actores_confianca 
      ORDER BY nom ASC
    `).all();

    return new Response(JSON.stringify(results), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
      }
