# Processus d'Authentification (TP1)

Ce document explique le cheminement complet d'une requête d'authentification dans l'application Angular (Guitar Practice Cloud).

## 1. Flux lors d'un clic sur "Se Connecter"

Voici le schéma annoté du parcours de la donnée lorsqu'un utilisateur tente de se connecter :

*(Schéma textuel, compatible avec tous les lecteurs Markdown)*

1. 👤 **Utilisateur** : Saisit ses identifiants et clique sur "Login".
   ⬇️ *(Appel de méthode)*
2. 🧩 **LoginPageComponent** : Capte l'événement et appelle le service via `auth.login(email, password)`.
   ⬇️ *(Appel de méthode)*
3. ⚙️ **AuthService** : Construit la requête et délègue au module HTTP.
   ⬇️ *(Requête POST /api/auth/login)*
4. 🌐 **HttpClient (Angular)** : Envoie la requête sur le réseau.
   ⬇️ *(HTTP POST avec le corps JSON)*
5. 🖥️ **API Express (Backend)** : Reçoit la requête, hache le mot de passe, et interroge la base.
   ⬇️ *(Requête Mongoose/MongoDB)*
6. 🗄️ **MongoDB Atlas** : Vérifie l'utilisateur.
   ⬆️ *(Utilisateur trouvé)*
7. 🖥️ **API Express** : Génère le JWT et renvoie `{ token: "...", user: {...} }`.
   ⬆️ *(Réponse HTTP 200 OK)*
8. ⚙️ **AuthService** : Stocke le token dans le `localStorage` et met à jour les `Signals`.
   ⬆️ *(Observable.next)*
9. 🧩 **LoginPageComponent** : Déclenche la redirection vers `/profile`.

### Explication détaillée avec le code

**Étape 1 : Le Composant (`login-page.ts`)**
Le composant capte l'action de l'utilisateur. Il ne fait jamais de HTTP lui-même, il délègue au service.
```typescript
login(): void {
  // On appelle le service d'authentification
  this.auth.login(this.email.value, this.password.value).subscribe({
    next: () => this.router.navigateByUrl('/profile'), // Succès : redirection
    error: () => this.error.set('Identifiants incorrects') // Échec : message
  });
}
```

**Étape 2 : Le Service (`auth.service.ts`)**
Le service s'occupe d'appeler l'API via `HttpClient` et d'intercepter la réponse (le token JWT) pour la sauvegarder localement.
```typescript
login(email: string, password: string) {
  return this.http
    .post<AuthResponse>('/api/auth/login', { email, password })
    .pipe(
      // 'tap' permet d'exécuter une action sans modifier la réponse pour le composant
      tap((response) => {
        localStorage.setItem('gpc_token', response.token); // Persistance
        this.token.set(response.token);                    // Mise à jour de l'état
        this.currentUser.set(response.user);               // Mise à jour du profil
      })
    );
}
```

---

## 2. Différence entre `Signal` et `localStorage`

Dans notre application, nous utilisons les deux de manière complémentaire. Pourquoi ne pas utiliser que l'un ou que l'autre ?

| Caractéristique | `localStorage` | `Signal` (Angular 16+) |
| :--- | :--- | :--- |
| **Persistance** | Garde les données même si on ferme le navigateur ou qu'on fait F5. | Se vide et se détruit à chaque rafraîchissement de page (F5). |
| **Réactivité** | Statique : si on le modifie, la page ne se met pas à jour visuellement. | Réactif : dès que sa valeur change, le HTML (`app.html`) se met à jour instantanément. |
| **Usage** | Sert uniquement de "disque dur" (sauvegarder le JWT pour ne pas reconnecter l'utilisateur à chaque visite). | Sert de "mémoire vive" (savoir en direct si un utilisateur est là pour afficher tel ou tel bouton). |

**En résumé :** On stocke le token "physiquement" dans le `localStorage` pour qu'il survive, mais on le charge dans un `Signal` pour qu'Angular sache quand cacher ou afficher le bouton "Se déconnecter".

---

## 3. Cartographie de l'Application (Mission 0)

Voici les éléments clés de l'architecture Angular demandés dans la Mission 0 :

- **Le composant racine** : `app.ts` et `app.html` (définissent le layout global et le routeur avec `<router-outlet>`).
- **La configuration des routes** : `app.routes.ts` (associe une URL comme `/login` à un composant comme `LoginPageComponent`).
- **L'enregistrement de HttpClient** : `app.config.ts` via `provideHttpClient()`.
- **Le mécanisme d'ajout du JWT** : `auth.interceptor.ts`. C'est un intercepteur HTTP qui clone chaque requête sortante pour y ajouter le header `Authorization: Bearer <token>`.

## 4. Où s'effectue la "mise à jour du profil" ?

Cette tâche traverse plusieurs couches de l'application :

1. **Côté Frontend (Interface) :** Dans `profile-page.ts`, la méthode `save()` récupère le nouveau nom du formulaire.
2. **Côté Frontend (Service) :** Dans `auth.service.ts`, la méthode `update(name)` utilise `HttpClient` pour faire un `PUT /api/users/me`.
3. **Côté Backend (API) :** Dans `backend/src/app.js`, la route `app.put("/api/users/me", auth, ...)` capte la requête.
4. **Côté Backend (Base de données) :** Le backend met à jour le document correspondant au token dans MongoDB Atlas avec `User.findByIdAndUpdate()`.
