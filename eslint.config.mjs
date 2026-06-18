import next from 'eslint-config-next';

// eslint-config-next 16 原生匯出 flat config 陣列,直接展開即可。
const eslintConfig = [
  ...next,
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
