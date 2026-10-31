/**
 * Test de l'adaptateur `src/services/backend.ts` sans accès réseau.
 *
 * On simule un hébergement STATIQUE (LWS) : /api/... renvoie du HTML.
 * On simule ensuite les réponses PostgREST de Supabase et on vérifie que
 * chaque opération d'administration produit le bon appel.
 */
import { api } from '../src/services/backend';

let passed = 0;
let failed = 0;
const calls: { url: string; body: any }[] = [];

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`✅ ${label}`);
  } else {
    failed += 1;
    console.log(`❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const htmlResponse = () =>
  new Response('<!doctype html><html><body>accueil</body></html>', {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

// --- Simulation du réseau ---------------------------------------------------
(globalThis as any).fetch = async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input.url;
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  calls.push({ url, body });

  // Hébergement statique : tout ce qui commence par /api renvoie la page HTML.
  if (url.startsWith('/api')) return htmlResponse();

  if (url.includes('/rest/v1/rpc/admin_login')) {
    return jsonResponse('jeton-abc123');
  }
  if (url.includes('/rest/v1/rpc/admin_check')) {
    return jsonResponse(true);
  }
  if (url.includes('/rest/v1/rpc/admin_list_references')) {
    return jsonResponse([
      {
        id: 'exp-1',
        title: 'Référence test',
        domain: 'btp',
        description: 'Description',
        execution: 'non_confirme',
        validation: 'valide',
        published: true,
        photos: [],
        documents: [],
        display_order: 3,
        created_at: 1000,
        updated_at: 1000,
        published_at: 1000,
      },
    ]);
  }
  if (url.includes('/rest/v1/rpc/')) {
    return jsonResponse(null);
  }
  if (url.includes('/rest/v1/site_settings')) {
    return jsonResponse({
      id: 1,
      name: 'ALFFA NIGER',
      slogan: 'La qualité au meilleur prix.',
      whatsapp_electronique: '22796222310',
      whatsapp_textile: '22796222310',
      hero_title: 'La qualité au meilleur prix.',
    });
  }
  if (url.includes('/rest/v1/featured')) {
    return jsonResponse([
      { shop: 'electronique', product_id: 'p1', display_order: 1 },
      { shop: 'textile', product_id: 't1', display_order: 1 },
    ]);
  }
  if (url.includes('/rest/v1/products')) {
    return jsonResponse([
      {
        id: 'p1',
        shop: 'electronique',
        name: 'Produit',
        brand: 'marque',
        category: 'cat',
        price: 1000,
        availability: 'disponible',
        created_at: 1,
      },
    ]);
  }
  if (url.includes('/rest/v1/experience_references')) {
    return jsonResponse([]);
  }
  return jsonResponse([]);
};

async function main() {
  // 1. Détection : hébergement statique -> bascule sur la base
  const login = await api('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'Bayi199210' }),
  });
  const loginData = await login.json();
  check('Connexion : réponse JSON (plus de page HTML)', login.ok === true);
  check('Connexion : jeton renvoyé', loginData.token === 'jeton-abc123', JSON.stringify(loginData));
  const loginCall = calls.find((c) => c.url.includes('rpc/admin_login'));
  check(
    'Connexion : mot de passe transmis à la fonction admin_login',
    loginCall?.body?.p_password === 'Bayi199210',
    JSON.stringify(loginCall?.body),
  );

  // 2. Vérification de session
  const checkRes = await api('/api/admin/check', { headers: { Authorization: 'Bearer jeton-abc123' } });
  const checkData = await checkRes.json();
  check('Vérification de session : authentifié', checkData.authenticated === true);

  // 3. Enregistrement d'un produit : conversion camelCase -> colonnes
  const saveProduct = await api('/api/products', {
    method: 'POST',
    headers: { Authorization: 'Bearer jeton-abc123', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 'p2',
      shop: 'textile',
      name: 'Bazin test',
      brand: 'getzner',
      category: 'bazins',
      price: 10000,
      availability: 'disponible',
      sourceImage: 'https://exemple.test/a.jpg',
      isNew: true,
      hidden: false,
      createdAt: 42,
    }),
  });
  const productCall = calls.find((c) => c.url.includes('rpc/admin_save_product'));
  check('Produit : enregistrement réussi', saveProduct.ok === true);
  check('Produit : colonne source_image convertie', productCall?.body?.p?.source_image === 'https://exemple.test/a.jpg');
  check('Produit : colonne is_new convertie', productCall?.body?.p?.is_new === true);
  check('Produit : jeton transmis', productCall?.body?.p_token === 'jeton-abc123');

  // 4. Suppression
  const del = await api('/api/products/textile/p2', {
    method: 'DELETE',
    headers: { Authorization: 'Bearer jeton-abc123' },
  });
  const delCall = calls.find((c) => c.url.includes('rpc/admin_delete_product'));
  check('Suppression produit : réussie', del.ok === true);
  check('Suppression produit : identifiant correct', delCall?.body?.p_id === 'p2');

  // 5. Paramètres : conversion et relecture
  const settings = await api('/api/settings', {
    method: 'PUT',
    headers: { Authorization: 'Bearer jeton-abc123', 'Content-Type': 'application/json' },
    body: JSON.stringify({ whatsappTextile: '22700000000', heroTitle: 'Titre' }),
  });
  const settingsData = await settings.json();
  const settingsCall = calls.find((c) => c.url.includes('rpc/admin_save_settings'));
  check('Paramètres : colonne whatsapp_textile convertie', settingsCall?.body?.p?.whatsapp_textile === '22700000000');
  check('Paramètres : seules les clés fournies sont envoyées', Object.keys(settingsCall?.body?.p || {}).length === 2);
  check('Paramètres : valeurs relues en camelCase', settingsData.settings?.whatsappElectronique === '22796222310');

  // 6. À la une : bascule
  const toggle = await api('/api/featured/toggle', {
    method: 'POST',
    headers: { Authorization: 'Bearer jeton-abc123', 'Content-Type': 'application/json' },
    body: JSON.stringify({ shop: 'electronique', id: 'p1' }),
  });
  const toggleData = await toggle.json();
  const featuredCall = calls.find((c) => c.url.includes('rpc/admin_save_featured'));
  check('À la une : produit retiré de la sélection', toggleData.featured.electronique.length === 0);
  check('À la une : écriture complète envoyée', Array.isArray(featuredCall?.body?.p?.textile));

  // 7. Expérience : liste publique
  const publicExp = await api('/api/experience');
  const publicData = await publicExp.json();
  check('Expérience publique : réponse JSON valide', Array.isArray(publicData.references));

  // 8. Expérience : administration
  const adminExp = await api('/api/admin/experience', {
    headers: { Authorization: 'Bearer jeton-abc123' },
  });
  const adminData = await adminExp.json();
  check('Expérience admin : liste récupérée', adminData.references?.length === 1);
  check(
    'Expérience admin : display_order converti en order',
    adminData.references?.[0]?.order === 3,
    JSON.stringify(adminData.references?.[0]),
  );

  const saveExp = await api('/api/experience', {
    method: 'POST',
    headers: { Authorization: 'Bearer jeton-abc123', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: {
        id: 'exp-2',
        title: 'Nouvelle',
        domain: 'vivrier',
        description: 'Texte',
        execution: 'non_confirme',
        validation: 'brouillon',
        published: false,
        photos: [],
        documents: [],
        order: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    }),
  });
  const expCall = calls.find((c) => c.url.includes('rpc/admin_save_reference'));
  check('Expérience : enregistrement réussi', saveExp.ok === true);
  check('Expérience : order converti en display_order', expCall?.body?.p?.display_order === 1);

  // 9. Routes non disponibles
  const upload = await api('/api/upload', { method: 'POST', body: new FormData() });
  const uploadData = await upload.json();
  check('Téléversement : refusé avec un message clair', upload.ok === false && typeof uploadData.error === 'string');

  // 10. Erreur de la base remontée proprement
  const originalFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async (input: any) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('/api')) return htmlResponse();
    return jsonResponse({ message: 'Mot de passe incorrect.', code: '28P01' }, 400);
  };
  const badLogin = await api('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'faux' }),
  });
  const badData = await badLogin.json();
  check('Mot de passe erroné : erreur remontée', badLogin.ok === false && /incorrect/i.test(badData.error || ''));
  (globalThis as any).fetch = originalFetch;

  console.log(`\n${passed}/${passed + failed} vérifications réussies.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('Échec du test :', err);
  process.exit(1);
});
