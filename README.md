# VeniVidiAV Web Explorer — Ultra-fluid (PMTiles + MapLibre)

Cette version utilise des **tuiles vectorielles PMTiles** pour une navigation fluide à l'échelle communale.

## 1) Génération des données

Depuis `webapp/` :

```bash
python build_data.py
```

Génère :
- `data/communes_pillars.geojson` (source géométrique)
- `data/communes_attrs.json` (table légère pour calcul des scénarios)
- `data/departements_pillars.geojson`

## 2) Génération PMTiles (ultra-fluide)

```bash
python build_pmtiles.py
```

Génère :
- `data/communes.mbtiles`
- `data/communes.pmtiles`

## 3) Lancer localement

```bash
cd C:\data\RESULTS_AV\03_FIGURES\policy_scenarios_custom_v2\webapp
python serve_range.py
```

Ouvrir :

`http://localhost:8000`

\textbf{Important}: PMTiles a besoin des requêtes HTTP \texttt{Range}.  
Le serveur standard `python -m http.server` peut ne pas les gérer selon l'environnement.  
Utilise donc `serve_range.py` pour les tests locaux.

## 4) Partager avec ton directeur (options)

### Option A — Simple (zip)
1. Zippe le dossier `webapp/` (avec `data/communes.pmtiles`).
2. Ton directeur dézippe.
3. Il lance `python -m http.server 8000` dans `webapp/`.
4. Il ouvre `http://localhost:8000`.

### Option B — GitHub Pages (recommandé)
1. Crée un repo GitHub (ex: `venividiav-web`).
2. Push le contenu de `webapp/` à la racine.
3. Active GitHub Pages (`Settings > Pages`, source = `main` / root).
4. Partage l’URL Pages.

### Option C — Hébergement statique (Netlify / Vercel)
1. Upload du dossier `webapp/` comme site statique.
2. Partage l’URL publique.

## Outputs annuels calculés dans l’app

- Communes sélectionnées
- Surface déployée (ha)
- Capacité installée (GWp)
- Production électrique (TWh/an)

Paramètres utilisateur :
- pondération des 5 piliers,
- application ou non de \(\phi\),
- cible de déploiement (ha),
- taux de mobilisation \(m\),
- densité PV (MWp/ha).
