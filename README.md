# Simon’s config

Site Astro statique publié sur GitHub Pages. Les données sont récupérées depuis
une API publique à chaque visite, dans le navigateur. La compilation ne contacte
pas l’API et aucune donnée locale n’est affichée en secours.

Le [contrat API](docs/api-contract.md) décrit l’endpoint, la structure JSON,
les champs attendus, CORS et les vérifications à effectuer pour construire l’API.

## Installation et configuration

Utiliser Node.js 24 ou supérieur.

```sh
npm ci
cp .env.example .env
```

Dans `.env`, remplacer `PUBLIC_CONFIG_API_URL` par l’URL complète de l’endpoint :

```dotenv
PUBLIC_CONFIG_API_URL=https://api.example.com/v1/config
```

Cette variable est publique et embarquée dans le JavaScript/HTML du site : ne pas
mettre de token dans l’URL. HTTPS est requis, sauf pour une API locale HTTP sur
`localhost`, `127.0.0.1` ou `[::1]`. Les URL avec credentials ou fragment sont refusées.
Une variable absente ou invalide empêche la compilation. Redémarrer le serveur
local après modification ; en production, republier le site pour changer l’URL.

```sh
npm run dev
```

Le site est disponible sur `http://localhost:4321`. Il affiche un état de
chargement, puis les catégories et cartes dans l’ordre fourni par l’API. La date
`updatedAt` est affichée en UTC. Si l’API est indisponible, trop lente ou renvoie
une réponse invalide, un message et le bouton « Retry » permettent de relancer
manuellement l’appel. JavaScript est nécessaire pour afficher le catalogue.

## Vérifications et API simulée

```sh
npm test
npm run check
npm run build
npm run preview
```

Les tests du contrat et du client utilisent le runner intégré à Node.js. Les
anciennes données servent uniquement de fixture dans `tests/fixtures/config.json`
et ne sont pas intégrées au site compilé.

Pour développer et vérifier le site avant que l’API réelle soit prête, lancer
ces commandes dans deux terminaux :

```sh
npm run mock-api
```

```sh
PUBLIC_CONFIG_API_URL=http://localhost:4322/v1/config npm run dev
```

L’API simulée sert les 3 catégories, 20 composants et 122 caractéristiques
actuels, avec les en-têtes JSON, CORS et `no-store`. Elle accepte les paramètres
suivants sur l’URL de l’endpoint :

| Paramètre | Scénario |
| --- | --- |
| `?delay=2000` | Réponse retardée pour observer le chargement. |
| `?scenario=empty` | Catalogue vide valide. |
| `?scenario=error` | Erreur HTTP 503. |
| `?scenario=retry&delay=1000` | Premier appel en erreur, suivant réussi ; vérifier le bouton désactivé pendant la relance. Redémarrer l’API pour réinitialiser ce scénario. |
| `?scenario=timeout` | Aucune réponse ; erreur après 10 secondes. |
| `?scenario=invalid-json` | Corps JSON illisible. |
| `?scenario=invalid-data` | JSON incomplet. |
| `?scenario=no-cors` | Absence de CORS ; l’appel doit échouer dans le navigateur. |
| `?scenario=plain-text` | Texte contenant une balise HTML, qui doit être affichée littéralement. |

Vérifier aussi `/#media-station` : après l’appel, la catégorie doit devenir la
destination du défilement. Sans JavaScript, un message explique comment afficher
les données. `MOCK_API_PORT` permet de changer le port de l’API simulée.

## Publication

Dans les variables GitHub Actions du dépôt (`Settings → Secrets and variables →
Actions → Variables`), définir **PUBLIC_CONFIG_API_URL** avec l’URL réelle.
Le workflow existant sur `main` utilise cette variable, exécute les tests et la
vérification TypeScript, puis compile et publie sur GitHub Pages.

Avant de publier, utiliser la checklist du [contrat API](docs/api-contract.md)
et contrôler un appel réel dans le navigateur, notamment les en-têtes CORS.
Une mise à jour des données de l’API ne nécessite pas de nouvelle publication.
