# Processus d'Upload et de Lecture Audio (TP2)

Ce document explique les mécanismes mis en œuvre dans Angular pour envoyer (upload) un fichier vers une API et pour lire un flux audio de manière sécurisée.

## 1. Le Flux de l'Upload

Lorsqu'un utilisateur sélectionne un fichier audio et clique sur envoyer, voici le trajet complet :

*(Schéma textuel de l'upload)*

1. 🧩 **TracksPageComponent** : Valide le fichier (type audio, < 25Mo).
   ⬇️ *(Appel de méthode)*
2. ⚙️ **TrackService** : Construit l'objet `FormData` (audio + titre).
   ⬇️ *(Requête POST /api/tracks avec le FormData)*
3. 🌐 **HttpClient (Angular)** : Envoie la requête `multipart/form-data`.
   ⬇️ *(Réseau)*
4. 🖥️ **API Express (Multer)** : Reçoit le fichier, vérifie le JWT et l'extension.
   ⬆️ *(Réponse 201 Created avec l'objet JSON Track)*
5. 🌐 **HttpClient** : Parse la réponse JSON.
   ⬆️ *(Observable.next)*
6. 🧩 **TracksPageComponent** : Affiche le message de succès et recharge la page 1.

### Explication du `FormData`
Pour envoyer un fichier, un simple JSON ne suffit pas car le fichier est un bloc binaire. Angular utilise un objet natif du navigateur appelé `FormData` (qui crée une requête de type `multipart/form-data`) :
```typescript
upload(file: File, title: string) {
  const body = new FormData();
  body.append('audio', file);  // Le fichier binaire
  body.append('title', title); // Le texte
  return this.http.post<Track>('/api/tracks', body);
}
```

---

## 2. Le Flux de Lecture Audio sécurisée (JWT)

Lire de l'audio de façon sécurisée est plus complexe qu'une simple balise `<audio src="...">`.

**Le problème d'une balise `<audio src="http://api/audio">` directe :**
Le navigateur ne sait pas qu'il doit attacher le token JWT (qui prouve que l'utilisateur est connecté) lorsqu'il charge la balise `audio`. La requête part sans le header `Authorization`, et le backend renvoie une erreur `401 Unauthorized`. L'intercepteur Angular n'est déclenché que pour les appels via `HttpClient`, pas pour les attributs `src` du HTML !

### La Solution : Blob et ObjectURL

Pour contourner ce problème, on utilise `HttpClient` pour faire la requête. De cette façon, **l'intercepteur Angular (`auth.interceptor.ts`) intercepte la requête et ajoute le JWT**.

*(Schéma textuel de lecture sécurisée)*

1. 🌐 **HttpClient (Angular)** : Initie `GET /api/tracks/:id/audio` (avec `responseType: blob`).
   ⬇️ *(Interception)*
2. 🛡️ **AuthInterceptor** : Clone la requête et y ajoute le header `Authorization: Bearer XXX`.
   ⬇️ *(Réseau)*
3. 🖥️ **API Express** : Vérifie le token JWT et envoie le flux binaire (Stream).
   ⬆️ *(Téléchargement complet)*
4. 🌐 **HttpClient** : Réceptionne le fichier sous forme de `Blob` dans la RAM.
   ⬇️ *(Création ObjectURL)*
5. 🌍 **Navigateur** : Génère une URL factice de type `blob:http://...`.
   ⬇️ *(Affectation attribut `src`)*
6. 🔊 **Lecteur Audio** : Utilise l'URL locale et joue le son !

### Pourquoi un "Blob" ?
On configure `HttpClient` avec `responseType: 'blob'`. Un **Blob** (*Binary Large Object*) est un conteneur qui stocke des données brutes en mémoire vive (RAM) dans le navigateur.

```typescript
// track.service.ts
audio(id: string) {
  return this.http.get(`/api/tracks/${id}/audio`, {
    responseType: 'blob', // IMPORTANT : on attend du binaire, pas du JSON !
  });
}
```

### La création de l'ObjectURL
Une balise `<audio>` a besoin d'une URL, elle ne comprend pas un objet `Blob` directement. On demande donc au navigateur de créer une fausse URL locale qui pointe vers la RAM.

```typescript
// tracks-page.ts
this.service.audio(track.id).subscribe({
  next: (blob) => {
    // 1. Si on avait déjà un morceau en lecture, on le supprime de la mémoire
    if (this.audioUrl()) URL.revokeObjectURL(this.audioUrl());
    
    // 2. On crée une URL locale pointant vers le Blob téléchargé
    const url = URL.createObjectURL(blob); // ex: "blob:http://localhost:4200/5g6-4h4"
    this.audioUrl.set(url);
  }
});
```

### ⚠️ Attention à la mémoire (`revokeObjectURL`)
Si on télécharge 50 musiques de 20 Mo, le navigateur va stocker 1 Go dans sa RAM. Tant que l'URL `blob:http://...` existe, le navigateur garde le fichier en mémoire.
Il est donc **obligatoire** d'appeler `URL.revokeObjectURL(url)` lorsqu'on change de musique ou qu'on quitte la page, pour permettre au *Garbage Collector* de vider la RAM.
```typescript
this.destroyRef.onDestroy(() => {
  if (this.audioUrl()) {
    URL.revokeObjectURL(this.audioUrl());
  }
});
```

---

## 3. Validation Frontend vs Backend

### Les contrôles du Backend (`backend/src/app.js`)
Le backend utilise la librairie `multer` pour l'upload. On peut y voir ces vérifications :
- **Poids max :** `limits: { fileSize: 25 * 1024 * 1024 }` (25 Mo).
- **Format audio :** `fileFilter: (req, file, cb) => { ... file.mimetype.startsWith("audio/") }`.

### Pourquoi le Frontend doit-il aussi valider ?
Bien que le backend soit déjà sécurisé, on a ajouté ces mêmes contrôles dans `tracks-page.ts` côté Angular. Pourquoi ?
**Parce que la validation frontend améliore drastiquement l'Expérience Utilisateur (UX).** 
Si l'utilisateur sélectionne un film de 2 Go, sans validation frontend, l'application tentera d'envoyer les 2 Go sur le réseau. L'utilisateur attendra de longues minutes avant de recevoir l'erreur du serveur. Avec la validation frontend, l'erreur s'affiche *instantanément* sans rien envoyer. 

Cependant, **le frontend ne remplace jamais le backend** : un attaquant (ou un hacker) peut utiliser Postman ou modifier le code JS dans son navigateur pour contourner la validation frontend. Le backend a toujours le dernier mot !

---

## 4. Réponses aux Questions (Mémoire, Buffering et Streaming)

- **Le backend envoie-t-il le fichier entier en mémoire ou peut-il l’envoyer progressivement depuis le disque ?**
  Le backend (Express) utilise `res.sendFile()` ou un mécanisme de flux (Stream). Il lit le fichier audio petit à petit depuis le disque dur du serveur et l'envoie sur le réseau de manière progressive (*streaming*). Cela évite au serveur de remplir toute sa mémoire RAM.

- **Avec `HttpClient` et `responseType: "blob"`, à quel moment le composant reçoit-il le fichier ?**
  Le composant Angular (et plus précisément le callback `next` du Subscribe) ne reçoit le Blob que lorsque le fichier est **téléchargé à 100%** dans la mémoire du navigateur.

- **Si la bibliothèque contient 100 morceaux, les 100 fichiers audio sont-ils chargés en mémoire dès l'affichage de la liste ?**
  **Non.** La requête de liste (`GET /api/tracks`) ne renvoie que du texte JSON léger (les informations comme le titre ou la taille). Le vrai fichier audio lourd (le Blob) n'est téléchargé que lorsqu'on clique sur le bouton "Play" d'un morceau spécifique (`GET /api/tracks/:id/audio`).

- **Quelle différence y aurait-il avec 100 éléments `<audio>` utilisant directement une URL HTTP ?**
  Si l'on affichait 100 `<audio src="...">` directement dans le HTML, le navigateur ouvrirait 100 requêtes HTTP simultanées pour commencer à télécharger (bufferiser) les premières secondes de chaque fichier audio en même temps. Cela saturerait instantanément la bande passante et ferait planter la navigation de l'utilisateur.

- **Pourquoi l'URL créée par `URL.createObjectURL` doit-elle être révoquée ?**
  Une *ObjectURL* lie une adresse web factice directement à un espace mémoire (le Blob) de la RAM du navigateur. Tant que cette URL n'est pas détruite, le "Garbage Collector" (le ramasse-miettes du navigateur) n'a pas l'autorisation d'effacer ce morceau de la RAM. Ne pas le révoquer crée donc une **fuite de mémoire** (Memory Leak).
