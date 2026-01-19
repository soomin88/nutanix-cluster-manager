import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    cors: true,
    proxy: {
      // Dynamic Proxy: Matches requests starting with /api/
      // Usage: /api/<TARGET_IP>/<ACTUAL_PATH>
      // Example: /api/192.168.100.20/PrismGateway/... -> https://192.168.100.20:9440/PrismGateway/...
      '^/api/.*': {
        changeOrigin: true,
        secure: false, // Bypass self-signed certificate errors
        
        // 1. Rewrite the path: Remove '/api/<IP>' prefix before sending to target
        rewrite: (path) => path.replace(/^\/api\/[^\/]+/, ''),
        
        // 2. Router: Dynamically determine the target host based on the URL
        router: (req: any) => {
          // Extract IP from URL: /api/192.168.100.20/...
          const match = req.url?.match(/^\/api\/([^\/]+)/);
          if (match && match[1]) {
            return `https://${match[1]}:9440`;
          }
          return 'http://localhost'; // Fallback
        },
        
        configure: (proxy: any, _options: any) => {
          proxy.on('error', (err: any, _req: any, _res: any) => {
            console.log('proxy error', err);
          });
          
          proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
             console.log('Proxying request to:', proxyReq.getHeader('host'), req.url);
             // CRITICAL: Remove Origin and Referer headers.
             // Nutanix Prism API checks these to prevent CSRF. 
             // By removing them, we make the request look like a direct tool interaction (like curl).
             proxyReq.removeHeader('Origin');
             proxyReq.removeHeader('Referer');
          });
        }
      } as any
    }
  }
});