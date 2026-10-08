# Rapport TP3 — réalisation et vérifications

Date : 8 octobre 2026.

## Mission 5 : suppression

Le composant concerné est `frontend-starter/src/app/components/tracks-page/tracks-page.ts` et le service est `frontend-starter/src/app/shared/services/track.service.ts`.

Chaque card affiche « Supprimer ». `confirm()` demande une confirmation avant l’appel. Le signal `deleting`, contenant les identifiants en cours de suppression, désactive le bouton ; la méthode vérifie également ce signal pour empêcher un second appel. `TrackService.delete()` utilise `HttpClient` pour envoyer `DELETE /api/tracks/:id`. Le composant présente un SnackBar de succès ou d’erreur, libère l’état et recharge la liste. Si la page courante n’existe plus après suppression, le chargement revient à la dernière page disponible.

Les erreurs 401 et 403 indiquent une absence d’autorisation. Le backend fourni renvoie 404 si la piste est absente **ou appartient à un autre utilisateur** : le message couvre donc les deux cas.

Le service centralise le contrat HTTP et permet de tester les requêtes. Le guard protège la navigation et le bouton guide l’utilisateur, mais ces contrôles sont exécutés sur son ordinateur et peuvent être contournés. Le middleware backend vérifie le JWT et la route de suppression recherche simultanément l’identifiant et `ownerId: req.auth.sub`. Le backend reste inchangé.

## Mission 6 : progression de l’upload

Le service utilise `FormData` avec les champs `audio` et `title`, `reportProgress: true` et `observe: 'events'`. `withXhr()` configure le transport HTTP pour recevoir les événements de progression d’envoi.

Les signaux existants distinguent les états : repos (`uploading` faux, aucun message), envoi (`uploading` vrai et pourcentage), réussite (`uploadSuccess`) et échec (`uploadError`). Le pourcentage vaut `Math.round(100 * loaded / total)` lorsque le total est fourni. Sans total, le pourcentage reste à sa dernière valeur connue ; aucun calcul avec une valeur absente n’est effectué.

Pendant l’envoi, le contrôle de titre est désactivé avec `FormControl.disable()`, le sélecteur de fichier et le bouton sont désactivés, et les méthodes empêchent une seconde soumission ou sélection. Les contrôles sont réactivés après la réponse ou l’erreur. La réussite vide le titre et la sélection interne, retire la card temporaire et recharge la première page. L’échec conserve le fichier pour réessayer.

Contrairement à une requête qui retourne seulement son résultat final, cet observable émet plusieurs événements : départ, progression, puis réponse. Le composant examine `event.type` ; 100 % d’octets envoyés ne garantit pas encore que le serveur a accepté le fichier. Seul `HttpEventType.Response` déclenche la réussite. Les logs du composant ne présentent pas l’objet d’erreur HTTP complet, un mot de passe ou un JWT.

## Mission 7 : rapport des tests

Les réponses sont simulées par `HttpTestingController` : aucun backend ni MongoDB n’est nécessaire aux tests frontend. Le composant utilise le véritable `TrackService` et un SnackBar simulé ; les confirmations sont simulées. Les tests existants des services et de l’intercepteur sont conservés et leurs assertions de résultat sont renforcées.

| Vérification | Résultat attendu | Résultat observé |
|---|---|---|
| Connexion | POST `/api/auth/login`, corps email/password, token et utilisateur stockés | Réussi |
| Pagination du service | GET `/api/tracks?page=2&limit=10`, paramètres corrects | Réussi |
| Intercepteur | Header `Authorization: Bearer …` avec un token fictif | Réussi |
| Upload du service | POST multipart, champs audio/title, progression activée, réponse finale correcte | Réussi |
| Suppression confirmée | Un seul DELETE, état bloqué pendant l’appel, SnackBar puis rechargement | Réussi |
| Confirmation annulée | Aucun DELETE | Réussi |
| Suppression 404, 403, 401 | Message adapté, état libéré, rechargement | Trois cas réussis |
| Dernière page devenue vide | Retour à la dernière page disponible | Réussi |
| Upload du composant | Progression 50 %, pas de succès avant la réponse, double appel bloqué, titre désactivé puis réactivé | Réussi |
| Échec d’upload | Message d’erreur et possibilité de réessayer | Réussi |
| Échec de chargement | Message affiché dans le template | Réussi |
| Backend : santé et schémas existants | Deux tests réussis sans MongoDB | Réussi |

Commandes exécutées :

- `cd frontend-starter && npm test` : **15 tests réussis, 4 fichiers, aucun échec**.
- `cd backend && npm test` : **2 tests réussis, aucun échec**.
- `cd frontend-starter && npm run build` : **réussi**, sortie dans `frontend-starter/dist/gpc`.

Les premiers essais ont identifié : dépendances non installées, Angular Material absent du package, versions d’animations incompatibles, option TypeScript `baseUrl` devenue obsolète, simulacre SnackBar masqué par le module réel et stockage local Node différent du navigateur. Ces points ont été corrigés. L’installation frontend a nécessité `--legacy-peer-deps` à cause de la contrainte Angular ancienne de la bibliothèque existante `lucide-angular`. Pour reproduire cette installation à partir du lockfile : `npm ci --legacy-peer-deps`. Node 25.6.0 produit un avertissement de version non LTS ; les vérifications ci-dessus ont néanmoins réussi.

## Vérification navigateur et captures Network

La page de connexion a été rechargée dans Chrome à `http://localhost:4200/login` : affichage vérifié, aucun avertissement ou erreur capturé dans la console après ce chargement. Cette observation ne valide pas les opérations métier authentifiées.

**Captures Network non réalisées à ce stade** : après ajout du `.env` par l’utilisateur, le backend a été relancé avec succès et sa connexion à MongoDB Atlas est confirmée. Le blocage initial `node: .env: not found` est résolu. La session navigateur reste déconnectée et aucune piste de test à supprimer n’a été désignée. Les succès HTTP réels et l’absence d’erreurs console pendant ces opérations restent donc à vérifier. Les tests simulés ne remplacent pas ces captures.

Une fois la configuration backend et une session de test disponibles :

1. Lancer le backend avec sa configuration habituelle, puis le frontend (`npm start`). Ne pas inclure les secrets dans ce rapport.
2. Dans Chrome, ouvrir les devtools, onglet Network, filtre Fetch/XHR ; se connecter.
3. Importer un fichier audio de test et observer le pourcentage, puis la réussite. Capturer le POST `/api/tracks` et son statut 201 ; utiliser une limitation réseau pour rendre les étapes visibles.
4. Supprimer uniquement cette piste de test après confirmation. Capturer le DELETE `/api/tracks/:id`, statut 204, et le GET de rechargement.
5. Vérifier la console pendant les deux opérations. Masquer `Authorization` et tout secret dans les captures.

Les événements Angular de progression sont des notifications de l’observable, pas des requêtes HTTP séparées : la capture Network montre la requête d’upload, l’interface montre son pourcentage et les tests simulent ces événements.

## Points pour la restitution orale

- Le service contient les appels HTTP ; le composant contient les états et interactions de l’interface.
- Le backend valide le JWT et le propriétaire pour chaque suppression.
- Angular calcule le pourcentage à partir des octets envoyés et du total fourni.
- Les tests HTTP remplacent le transport réseau par des réponses simulées ; ils n’accèdent pas à MongoDB.
- Le test d’intercepteur vérifie le header ajouté. Un test de guard vérifierait la décision de navigation et la redirection d’un utilisateur sans token ; aucun nouveau test de guard n’a été nécessaire pour atteindre le minimum demandé.
- Un test unitaire isole une responsabilité. Ici, les tests des services isolent le contrat HTTP ; les tests de composant font collaborer composant et service avec un transport simulé. Un test d’intégration avec le vrai backend vérifierait également le réseau, l’authentification et la persistance.

L’extension backend facultative n’a pas été réalisée.
