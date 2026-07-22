-- Table principale des acteurs commerciaux
CREATE TABLE IF NOT EXISTS actores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    categorie TEXT NOT NULL CHECK (categorie IN ('vendeurs','acheteurs','logistique','agents')),
    pays TEXT NOT NULL,
    produits TEXT,
    telephone TEXT,
    email TEXT,
    site_web TEXT,
    notes TEXT,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des verifications de confiance
CREATE TABLE IF NOT EXISTS verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acteur_id INTEGER NOT NULL,
    type_verification TEXT CHECK (type_verification IN ('tiers','terrain')),
    preuve TEXT,
    date_verification DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (acteur_id) REFERENCES actores(id) ON DELETE CASCADE
);

-- Table d'historique (audit)
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    acteur_id INTEGER,
    action TEXT,
    champ_modifie TEXT,
    ancienne_valeur TEXT,
    nouvelle_valeur TEXT,
    date_action DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Vue dynamique pour calculer le niveau de confiance
CREATE VIEW IF NOT EXISTS v_actores_confianca AS
SELECT 
    a.id,
    a.nom,
    a.categorie,
    a.pays,
    a.produits,
    a.telephone,
    a.email,
    a.site_web,
    a.notes,
    MAX(v.date_verification) AS derniere_verification,
    CASE 
        WHEN MAX(v.type_verification) = 'terrain' AND MAX(v.date_verification) >= date('now', '-1 year') THEN 'verifie_terrain'
        WHEN MAX(v.type_verification) IS NOT NULL AND MAX(v.date_verification) >= date('now', '-1 year') THEN 'verifie_tiers'
        WHEN MAX(v.date_verification) < date('now', '-1 year') THEN 'expire'
        ELSE 'declaratif'
    END AS statut_confiance
FROM actores a
LEFT JOIN verifications v ON a.id = v.acteur_id
GROUP BY a.id;
