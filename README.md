# Octopus-Origem

Fusion de **Origem** (prix réels producteur vs export) et **Origem2** (annuaire d'acteurs vérifiés) sur une seule plateforme Cloudflare Pages.

## Structure

```
Octopus-origem/
├── index.html                  → Front-end unique (onglets Preços / Diretório)
├── wrangler.toml                → Config Cloudflare Pages + binding D1
├── data/
│   ├── precos.json              → Base de prix (mise à jour par le collecteur)
│   └── dict.json                → Traductions PT/EN/FR/中文
├── functions/
│   └── api/
│       └── actores.js           → API Cloudflare Pages Functions (lit le D1)
├── collector/                   → Déployé séparément sur Vercel (cron Python)
│   ├── coletor_precos.py
│   ├── coletor_oportunidades.py
│   ├── coletor_job.py
│   ├── check.py
│   ├── requirements.txt
│   └── vercel.json
└── migrations/
    └── 001_schema_completo.sql  → Schema D1 complet (actores + verifications + audit_log + vue)
```

## Pourquoi deux hébergeurs

- **Cloudflare Pages** héberge le site + les API (`functions/api`) + la base D1. C'est le cœur de la plateforme.
- **Vercel** reste utilisé uniquement pour le cron Python (`collector/`), car Cloudflare Workers ne fait pas tourner Python nativement. Le collecteur écrit dans `data/precos.json`, qu'il faut ensuite pousser sur le repo (manuellement ou via une Action GitHub) pour que Cloudflare Pages le publie.

## Déploiement (checklist)

1. Créer une base D1 sur Cloudflare (`origeme2_db` ou autre nom) → copier le nouvel ID dans `wrangler.toml`
2. Créer un projet Pages connecté à ce repo GitHub
3. Dans Settings → Functions → D1 database bindings → binding `DB` → la base créée à l'étape 1
4. Console D1 → exécuter `migrations/001_schema_completo.sql`
5. Déployer `collector/` séparément sur Vercel (projet distinct, cron existant conservé)

## Statut des données

Voir la vue `v_actores_confianca` dans la base D1 pour le niveau de confiance calculé de chaque acteur (`declaratif`, `verifie_tiers`, `verifie_terrain`, `expire`).
