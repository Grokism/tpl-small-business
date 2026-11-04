// Public, non-secret configuration. A browser SPA is a public OAuth client (PKCE,
// no client secret), so every value here is safe to commit and ship to browsers.
// Filled in by the bookins PaaS provisioner at scaffold time, with runtime fallbacks
// so a single multi-tenant container can also serve any *.apps.bookins.io or custom CNAME origin.

function resolvePlaceholder(val: string, fallback: string): string {
  return !val || val.startsWith('__') ? fallback : val;
}

const runtimeOrigin =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : resolvePlaceholder('__APP_URL__', 'https://localhost:4200');

export const environment = {
  production: true,
  appName: resolvePlaceholder('__APP_NAME__', 'Bookins PermSet App'),
  appDescription: resolvePlaceholder(
    '__APP_DESCRIPTION__',
    'Zero-PII identity and origin-scoped authorization powered by bookins.io'
  ),
  bookinsApiBase: 'https://bookins.io',
  auth0: {
    domain: resolvePlaceholder('__AUTH0_DOMAIN__', 'login.bookins.io'),
    clientId: resolvePlaceholder('__AUTH0_CLIENT_ID__', 'Br7Z8Hc0Kh3GDY9cC6SOmmkWddELlbo3'),
    audience: resolvePlaceholder('__AUDIENCE__', 'https://bookins.io'),
    appUrl: runtimeOrigin,
  },
  // Namespace of the Auth0 custom claim the post-login Action injects the permsets under.
  permsetNamespace: resolvePlaceholder('__PERMSET_NAMESPACE__', 'https://grokism.io/permsets'),
};
