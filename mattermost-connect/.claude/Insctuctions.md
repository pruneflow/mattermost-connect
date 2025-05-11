* Principe DRY (Do not repeat yourself)
* Ne pas réinventer la roue
* pas de duplication
* Réutilisation des composants. 
* Typages propre, simple et unifié
* COmmentaire en anglais
* Utilisation des utilitaire et de ce qui à été fait avant
* Implémentation prête pour la production, pas d'exemple
* Utiliser MUI
* coder avec la version 7 de Material-ui. 
* Faire en sorte de travailler avec les composants les plus petits possibles et réutilisables pour faciliter la maintenance et l'organisation du projet.
* Utiliser des services comme un fichier utils pour toutes les méthodes qui ne sont pas du rendu direct. 
* Utiliser du css "standard" ainsi que les props sx de Material-Ui pour permettre à un dev de surcharger facilement chaque aspect du style des composants. 
* Tu dois faire en sorte que chaque fonctions / méthodes / composant aient une doc lisible, clair et compréhensible facilement
* Cette doc doit être dans un anglais facile à comprendre. 
* Utiliser typescript et crééer des types simples et réutilisable
* Tu dois éviter d'utiliser any / unknown le plus possible pour que tout reste clair pour le dev. 
* Tes types doivent être les plus simple possible
* De manière générale tu dois faire en sorte de rester le plus simple possible
* Le code doit bien sur être responsive: Touts les composants doivent être utilisable sur mobile et tablette. 
* L'affichage de l'app doit s'adapter facilement à tout type d'écrans. 
* Tu dois éviter de dupliquer du code, si tu vois du code dupliquer, tu dois créer un fichier utilis ou modifier un fichier utils existant pour ajouter les méthodes dupliquer, puis le sutiliser dans les différents fichiers. 
* Tu dois extraire les composants les plus petit possible et les utiliser de partout si possible au lieu de dupliquer. 
* Pour les Grid de MUI, il ne faut pas utiliser l'attribut item, et mettre les tailles comme ceci size={{xs: 12, sm: 4, ... }} au lieu de xs={12} sm={4}