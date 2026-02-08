import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    server: {
      port: parseInt(process.env.UI_PORT || '3200'),
      host: '0.0.0.0',
      hmr: {
        overlay: false
      },
      proxy: {
        '/api': {
          target: process.env.VITE_API_BASE_URL || 'http://localhost:3210',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            // Add some debugging
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          }
        }
      }
    },
    preview: {
      allowedHosts: ["Sales.tallmanequipment.com", ".tallmanequipment.com"],
      https: {},
    },
  };
});
