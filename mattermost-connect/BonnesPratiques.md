# Guide des Bonnes Pratiques - Développement Web

## Instructions pour Claude
Ce document contient les principes fondamentaux à respecter lors du développement d'applications web. **Applique systématiquement ces règles dans tous tes codes et recommandations.**

---

## 🔒 SÉCURITÉ (Priorité Absolue)

### Authentification & Autorisation
- **JAMAIS** de données sensibles en localStorage/sessionStorage
- **TOUJOURS** valider côté serveur (jamais uniquement côté client)
- Utiliser HTTPS partout, pas d'exceptions
- Implémenter CSP (Content Security Policy)
- Sanitiser TOUTES les entrées utilisateur (XSS)
- Utiliser des tokens JWT avec expiration courte
- Hacher les mots de passe avec bcrypt/argon2

### Validation des Données
```javascript
// ✅ BON - Validation stricte
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 254;
};

// ❌ MAUVAIS - Pas de validation
const saveUser = (data) => {
  database.save(data); // Vulnérable aux injections
};
```

---

## 🏗️ ARCHITECTURE & STRUCTURE

### Séparation des Responsabilités
- **Frontend** : Interface utilisateur uniquement
- **Backend** : Logique métier, validation, base de données
- **API** : Communication standardisée (REST/GraphQL)
- **Base de données** : Stockage persistant uniquement

### Organisation du Code
```
src/
├── components/     # Composants réutilisables
├── pages/         # Pages/vues principales
├── services/      # Appels API
├── utils/         # Fonctions utilitaires
├── hooks/         # Hooks personnalisés (React)
├── store/         # Gestion d'état globale
└── types/         # Types TypeScript
```

---

## ⚡ PERFORMANCE (Non-Négociable)

### Optimisations Obligatoires
- **Lazy loading** pour images et composants
- **Code splitting** par routes
- **Compression** gzip/brotli activée
- **CDN** pour les assets statiques
- **Mise en cache** appropriée (browser + server)

### Images & Assets
```javascript
// ✅ BON - Image optimisée
<img 
  src="image.webp"
  loading="lazy"
  width="300"
  height="200"
  alt="Description précise"
/>

// ❌ MAUVAIS - Image non optimisée
<img src="huge-image.png" />
```

### Métriques à Respecter
- **LCP** < 2.5s (Largest Contentful Paint)
- **FID** < 100ms (First Input Delay)
- **CLS** < 0.1 (Cumulative Layout Shift)

---

## 📱 RESPONSIVE & ACCESSIBILITÉ

### Mobile-First Obligatoire
```css
/* ✅ BON - Mobile d'abord */
.container {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 768px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### Accessibilité (WCAG 2.1 AA minimum)
- **TOUJOURS** des alt texts sur images
- Navigation au clavier fonctionnelle
- Contraste minimum 4.5:1
- Structure HTML sémantique
- ARIA labels quand nécessaire

```html
<!-- ✅ BON - Sémantique et accessible -->
<nav aria-label="Navigation principale">
  <ul>
    <li><a href="/home">Accueil</a></li>
  </ul>
</nav>

<button aria-label="Fermer la modal" onclick="closeModal()">
  ×
</button>
```

---

## 💾 GESTION DES DONNÉES

### État Application
- **Local** : useState, useReducer
- **Global** : Context API, Redux, Zustand
- **Serveur** : React Query, SWR
- **JAMAIS** localStorage pour données critiques

### Base de Données
```sql
-- ✅ BON - Index sur colonnes fréquemment utilisées
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_created_at ON posts(created_at);

-- Contraintes de validation
ALTER TABLE users ADD CONSTRAINT check_email 
CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

---

## 🔧 QUALITÉ DU CODE

### Standards Obligatoires
- **TypeScript** activé en mode strict
- **ESLint** + **Prettier** configurés
- **Tests** unitaires (Jest/Vitest)
- **Tests** d'intégration (Cypress/Playwright)
- **Git hooks** (pre-commit, pre-push)

### Conventions de Nommage
```javascript
// ✅ BON - Noms explicites
const calculateMonthlyPayment = (principal, rate, term) => {
  // ...
};

const userAuthenticationStatus = true;

// ❌ MAUVAIS - Noms flous
const calc = (p, r, t) => { /* ... */ };
const flag = true;
```

### Gestion d'Erreurs
```javascript
// ✅ BON - Gestion complète
try {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const data = await response.json();
  return data;
} catch (error) {
  console.error('Erreur lors du chargement:', error);
  showUserFriendlyError('Impossible de charger les données');
  throw error; // Re-throw pour handling upstream
}
```

---

## 🚀 DÉPLOIEMENT & MONITORING

### Environnements
- **Development** : Debugging activé, hot reload
- **Staging** : Réplique exacte de la production
- **Production** : Optimisé, monitoring, logs

### Variables d'Environnement
```javascript
// ✅ BON - Configuration par environnement
const config = {
  apiUrl: process.env.REACT_APP_API_URL,
  isProd: process.env.NODE_ENV === 'production',
  logLevel: process.env.LOG_LEVEL || 'info'
};

// ❌ MAUVAIS - Valeurs hardcodées
const API_URL = 'https://api.example.com';
```

---

## 📋 CHECKLIST PRE-PRODUCTION

### Sécurité
- [ ] HTTPS configuré avec certificat valide
- [ ] Headers de sécurité (CSP, HSTS, X-Frame-Options)
- [ ] Validation serveur sur toutes les entrées
- [ ] Pas de données sensibles exposées
- [ ] Rate limiting implémenté

### Performance
- [ ] Lighthouse score > 90
- [ ] Images optimisées (WebP/AVIF)
- [ ] Code splitting activé
- [ ] Cache-Control headers configurés
- [ ] Bundle analysis effectué

### Accessibilité
- [ ] Navigation clavier complète
- [ ] Screen reader compatible
- [ ] Contraste suffisant partout
- [ ] Alt texts sur toutes les images
- [ ] Focus indicators visibles

### SEO (si applicable)
- [ ] Meta tags appropriés
- [ ] Sitemap.xml généré
- [ ] URLs SEO-friendly
- [ ] Structured data (JSON-LD)
- [ ] Open Graph tags

---

## ⚠️ ERREURS À NE JAMAIS COMMETTRE

1. **Sécurité** : Stocker tokens JWT en localStorage
2. **Performance** : Charger toutes les données d'un coup
3. **Accessibilité** : Utiliser des divs cliquables sans role
4. **SEO** : Single Page App sans SSR/SSG
5. **Code** : Console.log en production
6. **Database** : Requêtes N+1 non optimisées
7. **UX** : Pas de feedback sur actions longues
8. **Mobile** : Design non responsive
9. **Erreurs** : Catch silencieux sans logging
10. **Performance** : Images non optimisées

---

## 🎯 RÈGLES D'OR POUR CLAUDE

Quand tu génères du code :
1. **Applique systématiquement** ces bonnes pratiques
2. **Commente** les parties critiques
3. **Propose des améliorations** si le code existant ne respecte pas ces règles
4. **Privilégie toujours** la sécurité et l'accessibilité
5. **Optimise** dès le départ, pas après coup

**Cette liste n'est pas exhaustive mais représente le minimum vital à respecter.**
