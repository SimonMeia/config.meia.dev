# Contrat de l’API de configuration

Le site `https://config.meia.dev` récupère le catalogue depuis le navigateur à
chaque visite. Il reste hébergé en statique sur GitHub Pages. L’API constitue
l’unique source de données : aucune copie locale n’est affichée en secours.

## Requête et réponse

- Endpoint proposé : `GET /v1/config`. L’URL complète est configurable via
  `PUBLIC_CONFIG_API_URL` ; le site n’ajoute aucun chemin à cette URL.
- Accès public en HTTPS, sans authentification, cookies ni pagination.
- Le client envoie `Accept: application/json`, utilise `credentials: "omit"`
  et `cache: "no-store"`, et abandonne la requête après 10 secondes.
- Succès : `200 OK`, `Content-Type: application/json; charset=utf-8`.
- Renvoyer `Access-Control-Allow-Origin: *` et `Cache-Control: no-store` sur
  les réponses, y compris les erreurs. Si un CDN est utilisé, désactiver
  également la mise en cache de cet endpoint sur le CDN.
- Les erreurs utilisent un statut HTTP d’erreur ; leur corps est libre.
  Le site affiche un message et un bouton « Retry », sans relance automatique.

L’origine du site et celle de l’API étant différentes, CORS doit être configuré
sur l’API. Aucun en-tête d’authentification n’est requis. En développement,
une API HTTP sur `localhost`, `127.0.0.1` ou `[::1]` est autorisée.

## Structure JSON

Tous les champs ci-dessous sont obligatoires. `null` n’est accepté pour aucun
champ. Les tableaux peuvent être vides et leur ordre est celui d’affichage.
Les champs supplémentaires sont ignorés par le client.

```json
{
  "updatedAt": "2026-06-22T12:00:00Z",
  "configs": [
    {
      "slug": "gaming-pc",
      "name": "Gaming PC",
      "components": [
        {
          "name": "CPU",
          "model": "Intel Core i5-8600K",
          "link": "https://www.digitec.ch/fr/s1/product/intel-core-i5-8600k-lga-1151-360-ghz-6-core-processeur-6448577",
          "specs": [
            { "name": "Cores", "value": 6 },
            { "name": "Base Clock", "value": "3.60 GHz" }
          ]
        }
      ]
    }
  ]
}
```

| Champ | Type | Signification / règle |
| --- | --- | --- |
| `updatedAt` | chaîne | Dernière modification du catalogue, pas la date de la requête. Date ISO 8601 UTC terminée par `Z`, par exemple `2026-06-22T12:00:00Z`. |
| `configs` | tableau | Catalogue complet. `[]` indique qu’aucune configuration n’est disponible. |
| `configs[].slug` | chaîne | Identifiant stable et unique dans le catalogue, selon `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Sert aux ancres : conserver notamment `gaming-pc`, `gaming-peripherals`, `media-station` lors de la migration. |
| `configs[].name` | chaîne | Nom de la catégorie, par exemple `Gaming PC`. |
| `configs[].components` | tableau | Composants de cette catégorie, dans leur ordre d’affichage. |
| `components[].name` | chaîne | Libellé du composant, par exemple `CPU`. |
| `components[].model` | chaîne | Modèle complet affiché dans la carte. |
| `components[].link` | chaîne | URL absolue HTTP ou HTTPS de la fiche du produit. Les autres protocoles sont refusés. |
| `components[].specs` | tableau | Caractéristiques, dans leur ordre d’affichage. |
| `specs[].name` | chaîne | Libellé de la caractéristique. |
| `specs[].value` | chaîne ou nombre | Valeur affichée telle quelle ; conserver les nombres JSON comme nombres. Pour une unité, fournir une chaîne telle que `3.60 GHz`. |

Les textes sont du texte brut, sans HTML ni Markdown. Les noms et modèles doivent
contenir au moins un caractère non blanc. `value` accepte une chaîne vide ou un
nombre fini, mais pas un booléen, un objet ou un tableau.

La date est affichée en `JJ.MM.AAAA`, en UTC. Si la réponse JSON ou un de ses
champs est invalide, le site rejette l’ensemble du catalogue.

## Vérifier l’API

Remplacer l’URL d’exemple par celle de l’API :

```sh
curl --include \
  --header 'Origin: https://config.meia.dev' \
  --header 'Accept: application/json' \
  'https://api.example.com/v1/config'
```

- [ ] Le statut est `200` et le corps est un objet JSON conforme à l’exemple.
- [ ] `Content-Type` annonce du JSON, `Access-Control-Allow-Origin` vaut `*`
      et `Cache-Control` contient `no-store`.
- [ ] Le catalogue comprend toutes les catégories, composants et caractéristiques
      attendus, dans le bon ordre, avec des slugs uniques et stables.
- [ ] `updatedAt` change lorsque les données changent, y compris pour un catalogue vide.
- [ ] Une modification est visible lors de la visite suivante, sans republier le site.
- [ ] Une requête depuis le navigateur sur le site et sur localhost réussit.
      `curl` seul ne vérifie pas que le navigateur accepte CORS.

La compilation du site ne contacte jamais l’API. Il faut republier le site
uniquement pour changer son code ou la valeur de `PUBLIC_CONFIG_API_URL`.
