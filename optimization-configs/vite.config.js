import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { resolve } from 'path';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProduction = mode === 'production';
  const shouldAnalyze = env.ANALYZE === 'true';

  return {
    plugins: [
      react({
        // Enable Fast Refresh
        fastRefresh: true,
        // Production optimizations
        babel: isProduction ? {
          plugins: [
            ['babel-plugin-transform-remove-console'],
          ],
        } : undefined,
      }),
      
      // Bundle analyzer
      shouldAnalyze && visualizer({
        filename: 'dist/bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // 'sunburst', 'treemap', 'network'
      }),
    ].filter(Boolean),

    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@store': resolve(__dirname, 'src/store'),
        '@assets': resolve(__dirname, 'src/assets'),
      },
    },

    css: {
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isProduction 
          ? '[hash:base64:8]' 
          : '[name]__[local]--[hash:base64:5]',
      },
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
          isProduction && require('cssnano')({
            preset: ['default', {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
            }],
          }),
        ].filter(Boolean),
      },
    },

    build: {
      target: 'es2020',
      minify: 'terser',
      
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: ['console.log', 'console.info'],
        },
        mangle: {
          safari10: true,
        },
      },
      
      rollupOptions: {
        output: {
          // Manual chunking strategy
          manualChunks: {
            // React core
            'react-vendor': ['react', 'react-dom'],
            
            // Router
            'router-vendor': ['react-router-dom'],
            
            // State management
            'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
            
            // API and data fetching
            'api-vendor': ['axios', '@tanstack/react-query'],
            
            // UI components and styling
            'ui-vendor': ['@headlessui/react', '@heroicons/react'],
            
            // Utilities
            'utils-vendor': ['lodash-es', 'date-fns', 'classnames'],
          },
          
          // Optimize chunk file names
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId 
              ? chunkInfo.facadeModuleId.split('/').pop() 
              : 'chunk';
            return `js/[name]-[hash].js`;
          },
          
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: ({ name }) => {
            if (/\.(gif|jpe?g|png|svg|webp|avif)$/.test(name ?? '')) {
              return 'images/[name]-[hash][extname]';
            }
            if (/\.css$/.test(name ?? '')) {
              return 'css/[name]-[hash][extname]';
            }
            if (/\.(woff|woff2|eot|ttf|otf)$/.test(name ?? '')) {
              return 'fonts/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
        
        // External dependencies (if using CDN)
        external: isProduction ? [] : [],
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
      
      // Asset inlining threshold
      assetsInlineLimit: 8192, // 8kb
      
      // Source maps
      sourcemap: isProduction ? 'hidden' : true,
      
      // CSS code splitting
      cssCodeSplit: true,
      
      // Report compressed size
      reportCompressedSize: true,
    },

    server: {
      port: 3000,
      open: true,
      cors: true,
      hmr: {
        overlay: true,
      },
    },

    preview: {
      port: 3000,
      open: true,
    },

    // Dependency optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@reduxjs/toolkit',
        'react-redux',
        'axios',
      ],
      exclude: [
        // Exclude problematic dependencies
      ],
    },

    // Environment variables
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      __DEV__: !isProduction,
    },

    // Esbuild options for faster builds
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none',
    },
  };
});