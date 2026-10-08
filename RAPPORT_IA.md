# Rapport d'usage de l'IA - TP3

## Mission 5 — Suppression d’une piste

- **Objectif :** Ajouter la possibilité de supprimer une piste musicale depuis l'interface avec une confirmation, un blocage du bouton pendant l'action et une notification (SnackBar) lors de la réussite ou l'échec, sans appeler le `HttpClient` directement dans le composant.
- **Prompt principal :** "Fais le sujet TP3 et explique ce que tu fais pour la mission 5 de suppression de piste."
- **Plan proposé par l'agent :** L'agent a proposé d'importer `MatSnackBar` pour les messages, de créer un signal `deleting` (de type Set) pour garder en mémoire l'ID des pistes en cours de suppression afin de bloquer le bouton, et de mettre à jour la méthode `delete()` du composant pour gérer le rechargement de la liste et les différents cas d'erreurs HTTP (404, 403).
- **Vérifications réalisées par le binôme :** Nous avons vérifié que le bouton passe en état désactivé lors du clic. Nous avons également regardé l'onglet Network pour valider que la requête de type `DELETE` partait avec le bon ID.
- **Erreurs ou propositions rejetées :** Aucune proposition n'a été rejetée, le code de suppression passait déjà initialement par le service, il a juste fallu l'enrichir de l'état `deleting` et des notifications.
- **Fichiers effectivement modifiés :** 
  - `frontend-starter/src/app/components/tracks-page/tracks-page.ts`
  - `frontend-starter/src/app/components/tracks-page/tracks-page.html`
- **Preuve de fonctionnement :** Clic sur suppression -> popup de confirmation -> bouton désactivé le temps du chargement -> SnackBar de succès apparait et la liste s'actualise.
- **Ce que nous savons expliquer :** Nous savons expliquer l'avantage de passer par un service (séparation de la vue et de la logique de données), et comment le backend protège la requête en vérifiant l'identité dans le JWT (middleware).

---

## Mission 6 — Progression de l’upload

- **Objectif :** Faire évoluer l'upload existant pour afficher la progression de l'envoi de fichier, bloquer le formulaire de saisie pendant le téléchargement et s'assurer qu'aucun mot de passe ou JWT n'est exposé dans la console.
- **Prompt principal :** "Implémente la mission 6 pour la progression d'upload en bloquant les contrôles."
- **Plan proposé par l'agent :** La progression était déjà partiellement traitée par le signal `uploadProgress()`, l'agent a donc ajouté les contraintes de désactivation HTML (`[disabled]="uploading()"`) sur les `<input>` et scanné le code source pour valider qu'aucune fuite de clé secrète (console.log) n'existait.
- **Vérifications réalisées par le binôme :** Essai d'envoi d'un fichier audio lourd et vérification visuelle que les `<input>` deviennent grisés (disabled) et insaisissables. Nous avons aussi analysé la console du navigateur.
- **Fichiers effectivement modifiés :** 
  - `frontend-starter/src/app/components/tracks-page/tracks-page.html`
- **Preuve de fonctionnement :** Upload d'un fichier -> le champ fichier et titre deviennent non-cliquables. La progression augmente.
- **Ce que nous savons expliquer :** La configuration `reportProgress: true` du `HttpClient` et l'interception de `HttpEventType.UploadProgress` pour calculer le ratio `(loaded / total) * 100`.

---

## Mission 7 — Tests automatisés

- **Objectif :** Ajouter 3 tests frontend (sur le service Auth, le Track service, et l'intercepteur).
- **Prompt principal :** "Rédige les 3 tests frontend obligatoires pour la mission 7."
- **Plan proposé par l'agent :** Création des 3 fichiers `.spec.ts` pour isoler les tests : un test simulant une requête de login, un simulant la méthode list() et ses paramètres d'URL, et un dernier testant l'intercepteur de token JWT.
- **Vérifications réalisées par le binôme :** Lancement de la commande `npm test` depuis le terminal qui a montré un succès sur l'ensemble des suites.
- **Erreurs ou propositions rejetées :** L'agent a eu besoin d'ajuster l'utilisation de `provideHttpClient(withInterceptors([...]))` dans le fichier de test de l'intercepteur pour utiliser l'API fonctionnelle moderne d'Angular 18+.
- **Fichiers effectivement modifiés :** 
  - `frontend-starter/src/app/shared/services/auth.service.spec.ts` (Création)
  - `frontend-starter/src/app/shared/services/track.service.spec.ts` (Mise à jour)
  - `frontend-starter/src/app/shared/interceptors/auth.interceptor.spec.ts` (Création)
- **Preuve de fonctionnement :** La commande `npm test -- --watch=false` passe avec succès sur la totalité des 8 tests exécutés.
- **Ce que nous savons expliquer :** Nous savons différencier les tests unitaires des tests d'intégration, l'utilisation de `HttpTestingController` pour ne pas avoir besoin de MongoDB pendant les tests, et le fonctionnement des tests d'intercepteur et de guard.

---

## Réponses pour la restitution orale

1. **Pourquoi la suppression passe par un service ?** 
   C'est une séparation des responsabilités. Le composant Angular gère l'affichage (HTML) et l'interaction, le *Service* gère la logique de communication réseau et d'accès aux données, ce qui rend le code réutilisable et facilement testable.
2. **Comment le backend protège la suppression ?** 
   Via un middleware qui vérifie d'abord que l'utilisateur est authentifié avec un token JWT valide. Ensuite, il vérifie en base de données que la piste appartient bien à cet utilisateur (UserId) avant de lancer la requête de suppression.
3. **Comment Angular calcule le pourcentage d’upload ?** 
   Grâce à l'option `reportProgress: true` lors de la requête `HttpClient`. Angular retourne alors des événements de type `HttpEventType.UploadProgress` contenant le nombre d'octets envoyés (`loaded`) et le total (`total`), ce qui permet le calcul `(loaded / total) * 100`.
4. **Pourquoi les tests HTTP n’ont pas besoin de MongoDB ?** 
   Car ce sont des tests unitaires qui utilisent le module `HttpTestingController`. Ce module intercepte la requête HTTP *avant* l'envoi réseau et simule une réponse. L'API et la base de données ne sont donc pas concernées.
5. **Ce que vérifie un test d’intercepteur ou de guard ?** 
   Le test de l'intercepteur vérifie qu'il ajoute bien dynamiquement un paramètre attendu (ex: le header `Authorization: Bearer <token>`) à une requête HTTP sortante. Le test de guard vérifie qu'un utilisateur non autorisé (ex: pas de token) est bien bloqué et redirigé (ex: vers le `/login`) lorsqu'il tente d'accéder à une route.
6. **Quelle différence existe entre un test unitaire et un test d’intégration ?** 
   Un **test unitaire** valide le comportement d'une fonction, classe ou composant isolé de ses dépendances extérieures en utilisant des fausses données (mocks). Un **test d'intégration** valide le comportement de l'ensemble d'un flux et s'assure que plusieurs composants communiquent bien entre eux, parfois jusqu'à la base de données.
