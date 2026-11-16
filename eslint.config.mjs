import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {ignores: ['.next/**', 'node_modules/**', 'public/**', 'next-env.d.ts', 'out-native/**', 'ios/**']},
  {
    rules: {
      // Avatars are signed Supabase URLs and blob previews; next/image adds nothing here.
      '@next/next/no-img-element': 'off',
      // Several effects intentionally read localStorage / cached data after hydration (so server and client
      // HTML match) and then set state. Keep it visible as a warning rather than a build-blocking error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
export default config;
