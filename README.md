# coolify-apple-theme

Thème « Apple design » pour Coolify auto-hébergé, inspiré de nodra : verre dépoli, fonds d'écran, police SF Pro, accent bleu Apple, contrôles façon macOS, en clair et en sombre.

Le thème **ne modifie pas Coolify**. Le conteneur officiel reste intact et les mises à jour de Coolify se font normalement : le thème se réapplique tout seul.

## Comment ça marche

```
navigateur ──> nginx du conteneur coolify ──> Laravel
                  │
                  └─ sub_filter '</head>' → ajoute apple-theme.css + apple-theme.js
```

- `apple-theme.conf` est monté dans `/etc/nginx/conf.d/`. Il ajoute le CSS et le JS du thème juste avant `</head>` dans chaque page HTML.
- Les fichiers du thème sont montés dans `public/coolify-apple-theme/` et servis par nginx. Le chemin ne doit pas commencer par `/app` : le proxy de Coolify envoie `PathPrefix(/app)` vers Reverb, les websockets.
- Les deux montages sont déclarés dans `/data/coolify/source/docker-compose.custom.yml`. Le script de mise à jour de Coolify inclut ce fichier, donc le thème survit aux mises à jour.

Le CSS se charge après celui de Coolify et remappe ses jetons (`--color-fg`, `--coollabs-*`, `--color-brand`…) sur les jetons Apple. Le JS :
- force la navigation « floating » et plate ;
- remplace le thème « custom » par sombre ;
- applique le fond d'écran et l'intensité du verre ;
- ajoute une section **Wallpaper** à *Profile › Appearance*.

## Installer sur le serveur Coolify

Sur le serveur, en root :

```bash
curl -fsSL https://raw.githubusercontent.com/Murathan-Aydin/coolify-apple-theme/main/get.sh | sudo bash
```

`get.sh` télécharge le dépôt dans `/opt/coolify-apple-theme`, puis lance `install.sh`, qui :
1. construit `dist/` et copie les fichiers dans `/data/coolify/apple-theme/` ;
2. crée `docker-compose.custom.yml`. S'il en existe déjà un, il affiche les deux volumes à y ajouter et s'arrête ;
3. recrée le conteneur `coolify` **avec la version de Coolify déjà installée**, et non `latest`, pour ne pas déclencher de mise à jour.

Variables d'environnement facultatives :
- `COOLIFY_APPLE_THEME_REF=v1.0` : installe une branche ou un tag précis.
- `GITHUB_TOKEN=…` : nécessaire tant que le dépôt est privé. Exemple : `curl -fsSL -H "Authorization: Bearer $GITHUB_TOKEN" https://raw.githubusercontent.com/…/get.sh | sudo -E bash`.

## Mettre à jour le thème

Relance la même commande `curl … | sudo bash`. Si le conteneur monte déjà le thème, seul nginx est rechargé, sans redémarrer Coolify. Les URL portent un numéro de version, donc les navigateurs reprennent le nouveau CSS.

## Désinstaller

```bash
curl -fsSL https://raw.githubusercontent.com/Murathan-Aydin/coolify-apple-theme/main/get.sh | sudo bash -s -- uninstall
```

Désinstalle toujours avec ce script : il retire les montages avant les fichiers. Si tu supprimes `/data/coolify/apple-theme` à la main en laissant `docker-compose.custom.yml`, Docker crée un dossier à la place de `apple-theme.conf` et nginx ne démarre plus.

## Développer

Avec une instance de dev Coolify (`scripts/dev` dans le checkout Coolify) :

```bash
scripts/dev-sync.sh ~/dev/coolify coolify-dev-<instance>
```

Le script construit le thème, le copie dans `<checkout>/public/coolify-apple-theme/` (exclu de git) et la config nginx dans le conteneur, puis recharge nginx. Relance-le après chaque modification. Recréer le conteneur retire la config nginx.

| Fichier | Rôle |
|---|---|
| `src/tokens.css` | Jetons Apple (clair et sombre), recettes de verre, correspondance avec les jetons Coolify |
| `src/materials.css` | Classes `at-glass`, `at-glass-strong`, `at-material`, `at-skeleton` |
| `src/wallpapers.css` | Fonds d'écran, version claire et sombre de chacun |
| `src/overrides.css` | Surcharges des classes Coolify : coquille, contrôles, cartes, menus, pages de connexion |
| `src/panel.css` | Section Wallpaper ajoutée à la page Appearance |
| `src/apple-theme.js` | Réglages Coolify forcés, fond d'écran, verre, page Appearance |

### Règles pour les surcharges

- Le thème cible les **classes et jetons de Coolify**, pas le HTML. Quand une mise à jour de Coolify renomme une classe, l'élément concerné reprend le style d'origine. Rien ne casse, on adapte `overrides.css`.
- Préfixer par `html:is(.dark, :not(.dark))` quand il faut passer devant une règle `.dark x` de Coolify. Certaines règles de la barre latérale sombre de Coolify sont en `html.dark:not([data-theme="custom"])` : il faut reprendre ce préfixe pour avoir le même poids.
- Coolify a une couche `@layer utilities` en `!important` qui rend opaques les fonds translucides de la page. Une règle CSS ne peut pas passer devant. Elle est neutralisée par les jetons : `--color-app` transparent dans `.app-main`, voir la fin de `tokens.css`.

## Fonds d'écran et images

Dans *Profile › Appearance › Wallpaper* :
- **Dégradés** : Horizon, Sunset, Neon, Aurora, Graphite, None (fond uni), chacun en version claire et sombre.
- **Photos** : Dolomites, Pacific, Forest. Ce sont celles de nodra, chargées depuis `images.unsplash.com`, donc le navigateur doit avoir accès à Internet.
- **Your image** : choisis un fichier ou colle une URL `https://`.
  - Un fichier est redimensionné dans le navigateur (2560 px maximum, en JPEG) et gardé dans le `localStorage` de ce navigateur. Rien n'est envoyé au serveur.
  - Une URL est utilisée telle quelle.

Un voile est posé sur les photos (plus clair en thème clair, plus sombre en thème sombre) pour garder le texte lisible.

## Limites

- Uniquement pour Coolify **auto-hébergé**, pas pour Coolify Cloud.
- Le thème ne change pas la structure HTML. Pour déplacer des éléments, il faut le faire en JS, ce qui est plus fragile.
- Chaque utilisateur choisit le fond d'écran, l'image et le verre dans son navigateur (`localStorage`).
- Le verre de Coolify est peint dans un `::before` (voir `overrides.css`). Un `backdrop-filter` posé sur un conteneur décalerait ses menus déroulants en `position: fixed`.
