🔲 Phase 2 : Users
Endpoint	Description	Priorité
GET /api/v1/me	Profil utilisateur connecté	🔴
DELETE /api/v1/me	Supprimer son compte (avec password)	🔴


🔲 Phase 3 : Pages
Endpoint	Description	Priorité
GET /api/v1/pages	Liste mes pages	🔴
POST /api/v1/pages	Créer une page (+ header auto)	🔴
GET /api/v1/pages/{pageId}	Détail d'une page avec blocks	🔴
DELETE /api/v1/pages/{pageId}	Supprimer une page	🔴



🔲 Phase 4 : Usernames
Endpoint	Description	Priorité
GET /api/v1/usernames/check	Vérifier disponibilité	🟡
PATCH /api/v1/pages/{pageId}/username	Changer username	🟡


 Phase 5 : Blocks
Endpoint	Description	Priorité
POST /api/v1/pages/{pageId}/blocks	Créer un block	🔴
PATCH /api/v1/pages/{pageId}/blocks/{blockId}	Modifier un block	🔴
DELETE /api/v1/pages/{pageId}/blocks/{blockId}	Supprimer un block	🔴
PUT /api/v1/pages/{pageId}/blocks	Bulk replace (Save)	🔴

Types de blocks à valider :

header (title, jobTitle, bio?, avatarUrl?)
text (text)
link (label, url, icon?)
separator (style?)
project (title, description?, link?, assets?)
technologies (technologyIds)

🔲 Phase 6 : Public Pages
Endpoint	Description	Priorité
GET /api/v1/public/pages/{username}	Page publique (sans auth)	🔴

🔲 Phase 7 : Technologies
Endpoint	Description	Priorité
GET /api/v1/technologies	Liste des technos (+ search)	🟡
POST /api/v1/technologies	Ajouter une techno	🟡

🔲 Phase 8 : Uploads (optionnel V1)
Endpoint	Description	Priorité
POST /api/v1/uploads	Presigned URL pour upload	🟢


🔲 Phase 9 : Finitions
 Ajouter le préfixe /api/v1 global
 Tests e2e complets
 Documentation Swagger complète



Phase 2 (Users) → Phase 3 (Pages) → Phase 5 (Blocks) → Phase 6 (Public) → Phase 4 (Usernames) → Phase 7 (Technologies) → Phase 8 (Uploads) → Phase 9 (Finitions)




