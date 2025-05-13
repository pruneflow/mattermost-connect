 L'implémentation suivrait le même modèle   que ce que nous avons fait pour les événements de frappe, mais étendu aux autres types d'événements.

  Le pattern général que nous avons établi est robuste et extensible :
  1. Organiser les données par entité concernée dans le singleton
  2. Créer un système d'abonnement ciblé par entité
  3. Développer des hooks spécialisés qui s'abonnent uniquement à ce qui les concerne
  4. Modifier les composants pour utiliser ces hooks spécifiques