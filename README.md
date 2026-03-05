# VeniVidiAV Web Explorer — (PMTiles + MapLibre)

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

## 2) Génération PMTiles

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
 `serve_range.py` pour les tests locaux.


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
