# Spécification : Barre de progression d'Upload

Ce document détaille les différentes approches UI/UX pour implémenter le suivi de progression (progress bar) lors de l'upload d'un fichier audio (MP3) dans le frontend Angular.

## 1. Prérequis Techniques (Angular)

Bien qu'aucun code ne soit fourni ici, l'implémentation technique nécessitera de modifier l'appel HTTP dans `TrackService` pour inclure les options suivantes :
- `reportProgress: true`
- `observe: 'events'`

Cela permettra au `HttpClient` d'émettre des événements de type `HttpEventType.UploadProgress` (fournissant le nombre d'octets envoyés `loaded` et le total `total`) avant d'émettre la réponse finale `HttpEventType.Response`.

---

## 2. Propositions d'Interface Utilisateur (UI)

Voici 4 approches différentes pour afficher la progression à l'utilisateur, de la plus standard à la plus immersive.

### Option A : La barre de progression linéaire classique
C'est l'approche la plus standard et la plus claire.

- **Positionnement :** Juste en dessous du bouton "Envoyer" dans la carte "Importer", ou à l'intérieur de la zone de drop du fichier.
- **Aspect visuel :** Une barre horizontale fine (ex: 4px à 8px de hauteur) avec un fond gris clair et une jauge de remplissage colorée (ex: vert ou bleu primaire).
- **Texte associé :** Un pourcentage exact (ex: `45%`) aligné à droite de la barre, et éventuellement le volume transféré (ex: `12 Mo / 25 Mo`).
- **Avantages :** Très familier pour les utilisateurs, donne une idée précise du temps restant.

### Option B : L'indicateur circulaire dans le bouton d'action
Une approche très minimaliste et moderne, idéale si l'espace est limité.

- **Positionnement :** Intégré directement à l'intérieur du bouton "Envoyer".
- **Aspect visuel :** Au moment du clic, le texte du bouton ("Envoyer") disparaît et laisse place à un anneau de progression (Spinner/Circular Progress). L'anneau se remplit proportionnellement à l'upload. Le bouton reste à l'état désactivé (`disabled`) pendant l'animation.
- **Texte associé :** Uniquement le pourcentage affiché au centre de l'anneau (ex: `72%`).
- **Avantages :** Gain de place, concentre l'attention de l'utilisateur sur l'action qu'il vient de déclencher, bloque naturellement les doubles clics.

### Option C : La notification "Toast" globale
Idéale si l'utilisateur peut continuer à naviguer dans l'application pendant que l'upload se fait en arrière-plan.

- **Positionnement :** Une petite fenêtre (Toast / Snackbar) flottante en bas à droite (ou en haut à droite) de l'écran.
- **Aspect visuel :** Une carte flottante contenant le nom du fichier (`mon-fichier.mp3`), une mini barre de progression linéaire en bas de la carte, et une icône d'état.
- **Comportement :** 
  1. Apparaît au lancement de l'upload.
  2. Affiche la progression.
  3. Devient verte avec une icône de succès une fois terminé (et disparaît après 3 secondes).
- **Avantages :** Non bloquant. Permet à l'utilisateur de scroller dans sa liste de musiques pendant que le gros fichier de 25 Mo s'envoie.

### Option D : La "Ghost Card" (Carte fantôme) dans la liste
L'approche la plus intégrée et fluide (inspirée des applications mobiles ou de Google Drive).

- **Positionnement :** Dans la liste "Mes pistes", en première position.
- **Aspect visuel :** Dès le début de l'upload, une carte transparente/grisée (skeleton) apparaît dans la bibliothèque de musiques. 
- **Contenu :** Elle affiche le nom du fichier en cours d'envoi. À la place du bouton "Play", on retrouve un indicateur de progression (circulaire ou linéaire).
- **Comportement :** Une fois l'upload arrivé à 100% et la réponse 201 du serveur reçue, la carte "fantôme" se matérialise en une vraie carte jouable de couleur normale.
- **Avantages :** Sensation de temps réel absolu. L'utilisateur voit immédiatement où atterrira sa musique une fois le traitement terminé.

---

## 3. Recommandation pour le TP

Pour ce TP, l'**Option A** (barre linéaire sous le bouton) ou l'**Option B** (bouton avec indicateur circulaire) sont les plus pertinentes car le formulaire d'upload est fixe et toujours visible sur la page. 

L'option D serait la plus "premium", mais demande une gestion d'état plus complexe dans le composant (gérer une liste mixte contenant des pistes réelles et des pistes "en cours d'envoi").
