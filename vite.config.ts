import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import dts from 'vite-plugin-dts';

const outDir = resolve(__dirname, 'dist');

let port: number;

const getIndexCode = (port: number) => (
  `await import('https://localhost:${port}/@vite/client');
  export * from 'https://localhost:${port}/src/index.ts';`
);

async function cleanDir(path: string) {
  if (existsSync(path)) {
    await rm(path, { recursive: true });
  }
  await mkdir(path, { recursive: true });
}

export default defineConfig({
  build: {
    minify: true,
    rollupOptions: {
      output: {
		format: 'es',
        entryFileNames: 'index.js',
      },
      treeshake: 'smallest',
    },
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es']
    },
  },
  server: {
    https: true,
    // port: 3000
  },
  publicDir: false,
  plugins: [
    mkcert(),
	dts({
		entryRoot: './src/',
		rollupTypes: true
	}),
    {
      name: 'll-serve',
      apply: 'serve',
      enforce: 'post',
      configureServer(server) {
        server.httpServer!.once('listening', async () => {
          // @ts-ignore
          port = server.httpServer.address()['port'];
          // await cleanDir(outDir);
		  const indexJs = join(outDir, 'index.js')
		  if (existsSync(indexJs)) {
			  await rm(indexJs);
		  }
          await writeFile(indexJs, getIndexCode(port));
        });
      },
      transform: (code, id) => {
        if (/\.(ts|tsx|js|jsx)$/i.test(id)) return;
        return code.replace(/\/src\//g, `https://localhost:${port}/src/`)
      },
    },
  ]
});
