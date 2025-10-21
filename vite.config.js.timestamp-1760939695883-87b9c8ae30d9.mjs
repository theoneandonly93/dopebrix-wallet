// vite.config.js
import { defineConfig, loadEnv } from "file:///mnt/c/Users/thisu/Downloads/fairbrix-phantom-wallet/node_modules/vite/dist/node/index.js";
import react from "file:///mnt/c/Users/thisu/Downloads/fairbrix-phantom-wallet/node_modules/@vitejs/plugin-react/dist/index.js";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __vite_injected_original_import_meta_url = "file:///mnt/c/Users/thisu/Downloads/fairbrix-phantom-wallet/vite.config.js";
function fairbrixNodePlugin() {
  let started = false;
  let child;
  const __filename = fileURLToPath(__vite_injected_original_import_meta_url);
  const __dirname = path.dirname(__filename);
  const primaryName = process.platform === "win32" ? "fbrix.exe" : "fbrix";
  const altName = primaryName === "fbrix.exe" ? "fbrix" : "fbrix.exe";
  const primaryPath = path.resolve(__dirname, "fbrix-node", primaryName);
  const altPath = path.resolve(__dirname, "fbrix-node", altName);
  const exePath = fs.existsSync(primaryPath) ? primaryPath : fs.existsSync(altPath) ? altPath : primaryPath;
  const confPath = path.resolve(__dirname, "fbrix-node", "fbx.conf");
  const dataDir = path.resolve(__dirname, "fbrix-node", "data");
  const start = (label = "dev") => {
    if (started)
      return;
    started = true;
    try {
      const envFlag = process.env.START_FAIRBRIX_NODE || "";
      if (/^(0|false|no)$/i.test(envFlag)) {
        console.log(`[fairbrix] auto-start disabled by START_FAIRBRIX_NODE=${envFlag}`);
        return;
      }
      const usePack = /^(1|true|yes|on)$/i.test(String(process.env.USE_FAIRBRIX_PACK || ""));
      if (usePack) {
        const packDir = process.env.FAIRBRIX_PACK_DIR || "";
        const packExe = process.env.FAIRBRIX_PACK_EXE || (packDir ? path.resolve(packDir, "START_Fairbrix.exe") : "");
        const candidates = [
          packExe,
          path.resolve(process.cwd(), "Fairbrix-pack", "START_Fairbrix.exe"),
          path.resolve(process.cwd(), "..", "Fairbrix-pack", "START_Fairbrix.exe")
        ].filter(Boolean);
        for (const c of candidates) {
          if (c && fs.existsSync(c)) {
            try {
              child = spawn(c, [], { stdio: "ignore", windowsHide: true, detached: true });
              child.unref();
              console.log(`[fairbrix] started Fairbrix-pack (${label}) -> ${c}`);
              return;
            } catch (e) {
              console.warn(`[fairbrix] failed to start Fairbrix-pack at ${c}:`, (e == null ? void 0 : e.message) || e);
            }
          }
        }
        console.warn("[fairbrix] USE_FAIRBRIX_PACK set but START_Fairbrix.exe not found; falling back to bundled node");
      }
      if (!fs.existsSync(exePath)) {
        console.warn(`[fairbrix] ${exeName} not found at ${exePath}. Skipping auto-start.`);
        return;
      }
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {
      }
      child = spawn(exePath, [`-conf=${confPath}`, `-datadir=${dataDir}`], {
        stdio: "ignore",
        windowsHide: true
      });
      console.log(`[fairbrix] started node (${label}) -> ${exePath}`);
      process.on("exit", () => {
        try {
          child && child.kill();
        } catch {
        }
      });
      process.on("SIGINT", () => {
        try {
          child && child.kill();
        } catch {
        }
        ;
        process.exit();
      });
      process.on("SIGTERM", () => {
        try {
          child && child.kill();
        } catch {
        }
        ;
        process.exit();
      });
    } catch (e) {
      console.warn(`[fairbrix] failed to start node (${label}):`, (e == null ? void 0 : e.message) || e);
    }
  };
  return {
    name: "fairbrix-node-starter",
    apply: "serve",
    configureServer() {
      start("serve");
    },
    // Attempt to also start for `vite preview` if supported by this Vite version
    configurePreviewServer() {
      start("preview");
    }
  };
}
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const rpcUrl = env.VITE_FAIRBRIX_RPC_URL || "http://127.0.0.1:8645";
  const rpcUser = env.VITE_FAIRBRIX_RPC_USER || "";
  const rpcPass = env.VITE_FAIRBRIX_RPC_PASS || "";
  const basic = Buffer.from(`${rpcUser}:${rpcPass}`).toString("base64");
  return {
    plugins: [react(), fairbrixNodePlugin()],
    server: {
      port: 5173,
      open: true,
      proxy: {
        "/rpc": {
          target: rpcUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/rpc(\/)?/, "/"),
          headers: rpcUser || rpcPass ? { Authorization: `Basic ${basic}` } : {}
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvdGhpc3UvRG93bmxvYWRzL2ZhaXJicml4LXBoYW50b20td2FsbGV0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvbW50L2MvVXNlcnMvdGhpc3UvRG93bmxvYWRzL2ZhaXJicml4LXBoYW50b20td2FsbGV0L3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9tbnQvYy9Vc2Vycy90aGlzdS9Eb3dubG9hZHMvZmFpcmJyaXgtcGhhbnRvbS13YWxsZXQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBzcGF3biB9IGZyb20gJ25vZGU6Y2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgZnMgZnJvbSAnbm9kZTpmcyc7XG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJztcblxuZnVuY3Rpb24gZmFpcmJyaXhOb2RlUGx1Z2luKCkge1xuICBsZXQgc3RhcnRlZCA9IGZhbHNlO1xuICBsZXQgY2hpbGQ7XG4gIGNvbnN0IF9fZmlsZW5hbWUgPSBmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCk7XG4gIGNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKTtcbiAgLy8gQ3Jvc3MtcGxhdGZvcm0vV1NMOiBwcmVmZXIgcGxhdGZvcm0gZGVmYXVsdCwgYnV0IGZhbGwgYmFjayB0byB0aGUgb3RoZXIgaWYgbm90IGZvdW5kXG4gIGNvbnN0IHByaW1hcnlOYW1lID0gcHJvY2Vzcy5wbGF0Zm9ybSA9PT0gJ3dpbjMyJyA/ICdmYnJpeC5leGUnIDogJ2Zicml4JztcbiAgY29uc3QgYWx0TmFtZSA9IHByaW1hcnlOYW1lID09PSAnZmJyaXguZXhlJyA/ICdmYnJpeCcgOiAnZmJyaXguZXhlJztcbiAgY29uc3QgcHJpbWFyeVBhdGggPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZmJyaXgtbm9kZScsIHByaW1hcnlOYW1lKTtcbiAgY29uc3QgYWx0UGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdmYnJpeC1ub2RlJywgYWx0TmFtZSk7XG4gIGNvbnN0IGV4ZVBhdGggPSBmcy5leGlzdHNTeW5jKHByaW1hcnlQYXRoKSA/IHByaW1hcnlQYXRoIDogKGZzLmV4aXN0c1N5bmMoYWx0UGF0aCkgPyBhbHRQYXRoIDogcHJpbWFyeVBhdGgpO1xuICBjb25zdCBjb25mUGF0aCA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdmYnJpeC1ub2RlJywgJ2ZieC5jb25mJyk7XG4gIGNvbnN0IGRhdGFEaXIgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZmJyaXgtbm9kZScsICdkYXRhJyk7XG5cbiAgY29uc3Qgc3RhcnQgPSAobGFiZWwgPSAnZGV2JykgPT4ge1xuICAgIGlmIChzdGFydGVkKSByZXR1cm47XG4gICAgc3RhcnRlZCA9IHRydWU7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGVudkZsYWcgPSBwcm9jZXNzLmVudi5TVEFSVF9GQUlSQlJJWF9OT0RFIHx8ICcnO1xuICAgICAgaWYgKC9eKDB8ZmFsc2V8bm8pJC9pLnRlc3QoZW52RmxhZykpIHtcbiAgICAgICAgY29uc29sZS5sb2coYFtmYWlyYnJpeF0gYXV0by1zdGFydCBkaXNhYmxlZCBieSBTVEFSVF9GQUlSQlJJWF9OT0RFPSR7ZW52RmxhZ31gKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiByZXF1ZXN0ZWQsIHRyeSB0byBzdGFydCBGYWlyYnJpeC1wYWNrJ3MgbGF1bmNoZXIgaW5zdGVhZCBvZiB0aGUgYnVuZGxlZCBub2RlXG4gICAgICBjb25zdCB1c2VQYWNrID0gL14oMXx0cnVlfHllc3xvbikkL2kudGVzdChTdHJpbmcocHJvY2Vzcy5lbnYuVVNFX0ZBSVJCUklYX1BBQ0sgfHwgJycpKTtcbiAgICAgIGlmICh1c2VQYWNrKSB7XG4gICAgICAgIGNvbnN0IHBhY2tEaXIgPSBwcm9jZXNzLmVudi5GQUlSQlJJWF9QQUNLX0RJUiB8fCAnJztcbiAgICAgICAgY29uc3QgcGFja0V4ZSA9IHByb2Nlc3MuZW52LkZBSVJCUklYX1BBQ0tfRVhFIHx8IChwYWNrRGlyID8gcGF0aC5yZXNvbHZlKHBhY2tEaXIsICdTVEFSVF9GYWlyYnJpeC5leGUnKSA6ICcnKTtcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IFtcbiAgICAgICAgICBwYWNrRXhlLFxuICAgICAgICAgIHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnRmFpcmJyaXgtcGFjaycsICdTVEFSVF9GYWlyYnJpeC5leGUnKSxcbiAgICAgICAgICBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy4uJywgJ0ZhaXJicml4LXBhY2snLCAnU1RBUlRfRmFpcmJyaXguZXhlJyksXG4gICAgICAgIF0uZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgICBmb3IgKGNvbnN0IGMgb2YgY2FuZGlkYXRlcykge1xuICAgICAgICAgIGlmIChjICYmIGZzLmV4aXN0c1N5bmMoYykpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNoaWxkID0gc3Bhd24oYywgW10sIHsgc3RkaW86ICdpZ25vcmUnLCB3aW5kb3dzSGlkZTogdHJ1ZSwgZGV0YWNoZWQ6IHRydWUgfSk7XG4gICAgICAgICAgICAgIGNoaWxkLnVucmVmKCk7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbZmFpcmJyaXhdIHN0YXJ0ZWQgRmFpcmJyaXgtcGFjayAoJHtsYWJlbH0pIC0+ICR7Y31gKTtcbiAgICAgICAgICAgICAgcmV0dXJuOyAvLyBkb24ndCBzdGFydCBidW5kbGVkIG5vZGVcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgY29uc29sZS53YXJuKGBbZmFpcmJyaXhdIGZhaWxlZCB0byBzdGFydCBGYWlyYnJpeC1wYWNrIGF0ICR7Y306YCwgZT8ubWVzc2FnZSB8fCBlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29uc29sZS53YXJuKCdbZmFpcmJyaXhdIFVTRV9GQUlSQlJJWF9QQUNLIHNldCBidXQgU1RBUlRfRmFpcmJyaXguZXhlIG5vdCBmb3VuZDsgZmFsbGluZyBiYWNrIHRvIGJ1bmRsZWQgbm9kZScpO1xuICAgICAgfVxuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGV4ZVBhdGgpKSB7XG4gICAgICAgIGNvbnNvbGUud2FybihgW2ZhaXJicml4XSAke2V4ZU5hbWV9IG5vdCBmb3VuZCBhdCAke2V4ZVBhdGh9LiBTa2lwcGluZyBhdXRvLXN0YXJ0LmApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0cnkgeyBmcy5ta2RpclN5bmMoZGF0YURpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7IH0gY2F0Y2gge31cbiAgICAgIGNoaWxkID0gc3Bhd24oZXhlUGF0aCwgW2AtY29uZj0ke2NvbmZQYXRofWAsIGAtZGF0YWRpcj0ke2RhdGFEaXJ9YF0sIHtcbiAgICAgICAgc3RkaW86ICdpZ25vcmUnLFxuICAgICAgICB3aW5kb3dzSGlkZTogdHJ1ZSxcbiAgICAgIH0pO1xuICAgICAgY29uc29sZS5sb2coYFtmYWlyYnJpeF0gc3RhcnRlZCBub2RlICgke2xhYmVsfSkgLT4gJHtleGVQYXRofWApO1xuICAgICAgcHJvY2Vzcy5vbignZXhpdCcsICgpID0+IHsgdHJ5IHsgY2hpbGQgJiYgY2hpbGQua2lsbCgpOyB9IGNhdGNoIHt9IH0pO1xuICAgICAgcHJvY2Vzcy5vbignU0lHSU5UJywgKCkgPT4geyB0cnkgeyBjaGlsZCAmJiBjaGlsZC5raWxsKCk7IH0gY2F0Y2gge307IHByb2Nlc3MuZXhpdCgpOyB9KTtcbiAgICAgIHByb2Nlc3Mub24oJ1NJR1RFUk0nLCAoKSA9PiB7IHRyeSB7IGNoaWxkICYmIGNoaWxkLmtpbGwoKTsgfSBjYXRjaCB7fTsgcHJvY2Vzcy5leGl0KCk7IH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW2ZhaXJicml4XSBmYWlsZWQgdG8gc3RhcnQgbm9kZSAoJHtsYWJlbH0pOmAsIGU/Lm1lc3NhZ2UgfHwgZSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB7XG4gICAgbmFtZTogJ2ZhaXJicml4LW5vZGUtc3RhcnRlcicsXG4gICAgYXBwbHk6ICdzZXJ2ZScsXG4gICAgY29uZmlndXJlU2VydmVyKCkgeyBzdGFydCgnc2VydmUnKTsgfSxcbiAgICAvLyBBdHRlbXB0IHRvIGFsc28gc3RhcnQgZm9yIGB2aXRlIHByZXZpZXdgIGlmIHN1cHBvcnRlZCBieSB0aGlzIFZpdGUgdmVyc2lvblxuICAgIGNvbmZpZ3VyZVByZXZpZXdTZXJ2ZXIoKSB7IHN0YXJ0KCdwcmV2aWV3Jyk7IH0sXG4gIH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnVklURV8nKTtcbiAgY29uc3QgcnBjVXJsID0gZW52LlZJVEVfRkFJUkJSSVhfUlBDX1VSTCB8fCAnaHR0cDovLzEyNy4wLjAuMTo4NjQ1JztcbiAgY29uc3QgcnBjVXNlciA9IGVudi5WSVRFX0ZBSVJCUklYX1JQQ19VU0VSIHx8ICcnO1xuICBjb25zdCBycGNQYXNzID0gZW52LlZJVEVfRkFJUkJSSVhfUlBDX1BBU1MgfHwgJyc7XG4gIGNvbnN0IGJhc2ljID0gQnVmZmVyLmZyb20oYCR7cnBjVXNlcn06JHtycGNQYXNzfWApLnRvU3RyaW5nKCdiYXNlNjQnKTtcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtyZWFjdCgpLCBmYWlyYnJpeE5vZGVQbHVnaW4oKV0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgICcvcnBjJzoge1xuICAgICAgICAgIHRhcmdldDogcnBjVXJsLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgIHJld3JpdGU6IChwKSA9PiBwLnJlcGxhY2UoL15cXC9ycGMoXFwvKT8vLCAnLycpLFxuICAgICAgICAgIGhlYWRlcnM6IChycGNVc2VyIHx8IHJwY1Bhc3MpID8geyBBdXRob3JpemF0aW9uOiBgQmFzaWMgJHtiYXNpY31gIH0gOiB7fSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4VSxTQUFTLGNBQWMsZUFBZTtBQUNwWCxPQUFPLFdBQVc7QUFDbEIsU0FBUyxhQUFhO0FBQ3RCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUxrTCxJQUFNLDJDQUEyQztBQU9qUSxTQUFTLHFCQUFxQjtBQUM1QixNQUFJLFVBQVU7QUFDZCxNQUFJO0FBQ0osUUFBTSxhQUFhLGNBQWMsd0NBQWU7QUFDaEQsUUFBTSxZQUFZLEtBQUssUUFBUSxVQUFVO0FBRXpDLFFBQU0sY0FBYyxRQUFRLGFBQWEsVUFBVSxjQUFjO0FBQ2pFLFFBQU0sVUFBVSxnQkFBZ0IsY0FBYyxVQUFVO0FBQ3hELFFBQU0sY0FBYyxLQUFLLFFBQVEsV0FBVyxjQUFjLFdBQVc7QUFDckUsUUFBTSxVQUFVLEtBQUssUUFBUSxXQUFXLGNBQWMsT0FBTztBQUM3RCxRQUFNLFVBQVUsR0FBRyxXQUFXLFdBQVcsSUFBSSxjQUFlLEdBQUcsV0FBVyxPQUFPLElBQUksVUFBVTtBQUMvRixRQUFNLFdBQVcsS0FB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
